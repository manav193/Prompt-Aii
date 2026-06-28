from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional

import bcrypt
import jwt
import httpx
import hashlib
import math
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

from promptlets_data import PROMPTLETS
from collections_data import (
    COLLECTIONS,
    CATEGORY_DEFAULTS,
    HOW_TO_USE_BY_CATEGORY,
    EXPECTED_OUTPUT_BY_CATEGORY,
    cover_image,
)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24  # 1 day
REFRESH_TOKEN_DAYS = 7
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ---------------------------------------------------------------------------
# App + Router
# ---------------------------------------------------------------------------
app = FastAPI(title="PromptAI API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("promptai")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": now + timedelta(minutes=ACCESS_TOKEN_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": now + timedelta(days=REFRESH_TOKEN_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=ACCESS_TOKEN_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=REFRESH_TOKEN_DAYS * 24 * 3600,
        path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    # Match attributes used when setting so the browser overwrites the original cookies.
    for name in ("access_token", "refresh_token"):
        response.set_cookie(
            key=name,
            value="",
            httponly=True,
            secure=True,
            samesite="none",
            max_age=0,
            expires=0,
            path="/",
        )


def public_user(user: dict) -> dict:
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user.get("name", ""),
        "picture": user.get("picture"),
        "provider": user.get("provider", "email"),
        "role": user.get("role", "user"),
        "subscription": user.get("subscription", "free"),
        "email_verified": bool(user.get("email_verified", False)),
        "created_at": user.get("created_at"),
    }


# ---------------------------------------------------------------------------
# Credit system
# ---------------------------------------------------------------------------
FREE_REFILL_AMOUNT = 100
RENEWAL_DAYS = 30

# Cost per action (in credits). Pro users are exempt.
PROMPT_USE_COST = 1     # using/copying a marketplace promptlet
OPTIMIZE_COST = 3       # AI-powered optimizer
SAVE_COST = 0           # saving / favoriting is free


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_iso(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    try:
        dt = datetime.fromisoformat(value)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None


async def maybe_refill_credits(user: dict) -> dict:
    """If balance is 0 and the personal 30-day countdown has expired, refill to 100."""
    if user.get("subscription") == "pro":
        return user
    balance = int(user.get("credits_balance", 0))
    if balance > 0:
        return user
    ncd = parse_iso(user.get("next_credit_date"))
    if ncd and datetime.now(timezone.utc) >= ncd:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"credits_balance": FREE_REFILL_AMOUNT, "next_credit_date": None}},
        )
        user["credits_balance"] = FREE_REFILL_AMOUNT
        user["next_credit_date"] = None
    return user


async def consume_credits(user: dict, amount: int) -> dict:
    """Decrement credits and (when reaching zero) start the 30-day countdown."""
    if amount <= 0 or user.get("subscription") == "pro":
        return user
    user = await maybe_refill_credits(user)
    balance = int(user.get("credits_balance", 0))
    if balance < amount:
        raise HTTPException(
            status_code=402,
            detail=(
                f"Not enough credits. You need {amount} but have {balance}. "
                "Upgrade to Pro for unlimited credits."
            ),
        )
    new_balance = balance - amount
    update: dict = {
        "credits_balance": new_balance,
        "credits_used": int(user.get("credits_used", 0)) + amount,
    }
    if new_balance == 0 and not user.get("next_credit_date"):
        update["next_credit_date"] = (datetime.now(timezone.utc) + timedelta(days=RENEWAL_DAYS)).isoformat()
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    user.update(update)
    return user


def credit_summary(user: dict) -> dict:
    plan = user.get("subscription", "free")
    if plan == "pro":
        return {
            "plan": "pro",
            "balance": None,        # unlimited
            "used": int(user.get("credits_used", 0)),
            "next_credit_date": None,
            "refill_amount": None,
        }
    return {
        "plan": "free",
        "balance": int(user.get("credits_balance", 0)),
        "used": int(user.get("credits_used", 0)),
        "next_credit_date": user.get("next_credit_date"),
        "refill_amount": FREE_REFILL_AMOUNT,
    }


def can_access_promptlet(user: dict, promptlet: dict) -> bool:
    if promptlet.get("plan") == "free":
        return True
    return user.get("subscription") == "pro"


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        # Server-side invalidation: tokens issued before tokens_valid_from are rejected (logout).
        tvf = user.get("tokens_valid_from")
        iat = payload.get("iat")
        if tvf is not None and iat is not None and int(iat) < int(tvf):
            raise HTTPException(status_code=401, detail="Token revoked")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class RegisterBody(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class ForgotBody(BaseModel):
    email: EmailStr


class ResetBody(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=128)


class GoogleSessionBody(BaseModel):
    session_id: str


class ContactBody(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    message: str = Field(min_length=5, max_length=4000)


class NewsletterBody(BaseModel):
    email: EmailStr


class VerifyEmailBody(BaseModel):
    token: str


class FavoriteBody(BaseModel):
    favorite: bool


class UpgradeBody(BaseModel):
    plan: str = Field(pattern="^(free|pro)$")


class OptimizeBody(BaseModel):
    idea: str = Field(min_length=3, max_length=4000)
    model: str = Field(min_length=1, max_length=40)
    category: str = Field(min_length=1, max_length=40)


class SavePromptBody(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    prompt: str = Field(min_length=1, max_length=8000)
    model: str = Field(min_length=1, max_length=40)
    category: str = Field(min_length=1, max_length=40)
    idea: Optional[str] = None


class RateBody(BaseModel):
    stars: int = Field(ge=1, le=5)
    review: Optional[str] = Field(default=None, max_length=1500)


class ConvertBody(BaseModel):
    prompt: str = Field(min_length=3, max_length=4000)
    source_model: str = Field(min_length=1, max_length=40)
    target_model: str = Field(min_length=1, max_length=40)


class FollowBody(BaseModel):
    creator: str = Field(min_length=1, max_length=80)


class AdminPromptletBody(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    slug: Optional[str] = None
    category: str = Field(min_length=1, max_length=60)
    plan: str = Field(pattern="^(free|pro)$")
    description: str = Field(min_length=10, max_length=600)
    prompt: str = Field(min_length=5, max_length=8000)
    models: list = Field(default_factory=list)
    difficulty: Optional[str] = "Intermediate"
    credits_cost: int = Field(default=1, ge=0, le=10)
    quality: int = Field(default=4, ge=1, le=5)
    how_to_use: Optional[str] = ""
    expected_output: Optional[str] = ""
    featured: bool = False
    gradient: Optional[list] = None
    preview_image_url: Optional[str] = None


class AdminUserPatchBody(BaseModel):
    subscription: Optional[str] = Field(default=None, pattern="^(free|pro)$")
    credits_balance: Optional[int] = Field(default=None, ge=0, le=100000)
    role: Optional[str] = Field(default=None, pattern="^(user|admin)$")


class AdminCategoryBody(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    active: bool = True


class AdminCollectionBody(BaseModel):
    slug: str = Field(min_length=1, max_length=60)
    name: str = Field(min_length=1, max_length=120)
    subtitle: Optional[str] = ""
    model: Optional[str] = None
    categories: Optional[list] = None
    cover: Optional[str] = None
    gradient: Optional[list] = None



# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@api.get("/health")
async def health():
    return {"status": "ok", "service": "promptai", "time": datetime.now(timezone.utc).isoformat()}


# --- Auth: email / password ---
@api.post("/auth/register")
async def register(body: RegisterBody, response: Response):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    verification_token = secrets.token_urlsafe(32)
    user_doc = {
        "user_id": user_id,
        "email": email,
        "name": body.name.strip(),
        "password_hash": hash_password(body.password),
        "provider": "email",
        "role": "user",
        "picture": None,
        "subscription": "free",
        "credits_balance": FREE_REFILL_AMOUNT,
        "credits_used": 0,
        "next_credit_date": None,
        "email_verified": False,
        "email_verification_token": verification_token,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user_doc)
    logger.info(
        "Verify email for %s -> %s/verify-email?token=%s",
        email, FRONTEND_URL, verification_token,
    )
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return public_user(user_doc)


@api.post("/auth/login")
async def login(body: LoginBody, request: Request, response: Response):
    email = body.email.lower().strip()
    # Identify by email only — preview ingress rotates upstream IPs, so IP+email
    # buckets never reach the lockout threshold. Email-only is the safe default.
    identifier = f"email:{email}"

    # Brute force check
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        locked_at = attempt.get("locked_at")
        if isinstance(locked_at, str):
            locked_at = datetime.fromisoformat(locked_at)
        if locked_at and locked_at.tzinfo is None:
            locked_at = locked_at.replace(tzinfo=timezone.utc)
        if locked_at and (datetime.now(timezone.utc) - locked_at) < timedelta(minutes=15):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")

    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"locked_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_one({"identifier": identifier})
    access = create_access_token(user["user_id"], email)
    refresh = create_refresh_token(user["user_id"])
    set_auth_cookies(response, access, refresh)
    return public_user(user)


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    # Best-effort: mark all tokens issued before NOW as invalid for this user.
    token = request.cookies.get("access_token")
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM], options={"verify_exp": False})
            user_id = payload.get("sub")
            if user_id:
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {"tokens_valid_from": int(datetime.now(timezone.utc).timestamp()) + 1}},
                )
        except jwt.InvalidTokenError:
            pass
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(user["user_id"], user["email"])
        response.set_cookie(
            key="access_token", value=access, httponly=True, secure=True,
            samesite="none", max_age=ACCESS_TOKEN_MINUTES * 60, path="/",
        )
        return {"ok": True}
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@api.post("/auth/forgot-password")
async def forgot_password(body: ForgotBody):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    # Always return ok to avoid email enumeration.
    if user and user.get("provider") == "email":
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token,
            "user_id": user["user_id"],
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            "used": False,
        })
        logger.info("Password reset link for %s -> %s/reset-password?token=%s", email, FRONTEND_URL, token)
    return {"ok": True}


@api.post("/auth/reset-password")
async def reset_password(body: ResetBody):
    token_doc = await db.password_reset_tokens.find_one({"token": body.token})
    if not token_doc or token_doc.get("used"):
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    expires_at = token_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expired")
    await db.users.update_one(
        {"user_id": token_doc["user_id"]},
        {"$set": {"password_hash": hash_password(body.password)}},
    )
    await db.password_reset_tokens.update_one({"token": body.token}, {"$set": {"used": True}})
    return {"ok": True}


# --- Auth: Google (Emergent Managed OAuth) ---
@api.post("/auth/google/session")
async def google_session(body: GoogleSessionBody, response: Response):
    async with httpx.AsyncClient(timeout=15) as http_client:
        try:
            r = await http_client.get(
                EMERGENT_SESSION_URL,
                headers={"X-Session-ID": body.session_id},
            )
        except httpx.HTTPError as exc:
            logger.error("Emergent session fetch failed: %s", exc)
            raise HTTPException(status_code=502, detail="Auth provider unreachable")
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    data = r.json()
    email = (data.get("email") or "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="No email returned")

    user = await db.users.find_one({"email": email})
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": data.get("name") or email.split("@")[0],
            "picture": data.get("picture"),
            "provider": "google",
            "role": "user",
            "password_hash": None,
            "subscription": "free",
            "credits_balance": FREE_REFILL_AMOUNT,
            "credits_used": 0,
            "next_credit_date": None,
            "email_verified": True,  # Google verifies email for us
            "created_at": now_iso(),
        }
        await db.users.insert_one(user)
    else:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "name": user.get("name") or data.get("name") or email.split("@")[0],
                "picture": data.get("picture") or user.get("picture"),
                "email_verified": True,
            }},
        )
        user["email_verified"] = True

    access = create_access_token(user["user_id"], email)
    refresh = create_refresh_token(user["user_id"])
    set_auth_cookies(response, access, refresh)
    return public_user(user)


# --- Newsletter ---
@api.post("/newsletter")
async def newsletter(body: NewsletterBody):
    email = body.email.lower().strip()
    existing = await db.newsletter.find_one({"email": email})
    if existing:
        return {"ok": True, "duplicate": True}
    await db.newsletter.insert_one({
        "email": email,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True, "duplicate": False}


# --- Contact ---
@api.post("/contact")
async def contact(body: ContactBody):
    doc = {
        "id": uuid.uuid4().hex,
        "name": body.name.strip(),
        "email": body.email.lower().strip(),
        "message": body.message.strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "new",
    }
    await db.contact_submissions.insert_one(doc)
    return {"ok": True, "id": doc["id"]}


# ---------------------------------------------------------------------------
# Email verification
# ---------------------------------------------------------------------------
@api.post("/auth/verify-email")
async def verify_email(body: VerifyEmailBody):
    user = await db.users.find_one({"email_verification_token": body.token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"email_verified": True}, "$unset": {"email_verification_token": ""}},
    )
    return {"ok": True}


@api.post("/auth/resend-verification")
async def resend_verification(user: dict = Depends(get_current_user)):
    if user.get("email_verified"):
        return {"ok": True, "already_verified": True}
    token = secrets.token_urlsafe(32)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"email_verification_token": token}},
    )
    logger.info(
        "Resent verify-email link for %s -> %s/verify-email?token=%s",
        user["email"], FRONTEND_URL, token,
    )
    return {"ok": True}


# ---------------------------------------------------------------------------
# Promptlets marketplace
# ---------------------------------------------------------------------------
def serialize_promptlet(p: dict, user: Optional[dict] = None) -> dict:
    locked = bool(user and not can_access_promptlet(user, p))
    rating_count = int(p.get("rating_count", 0))
    rating_avg = round(float(p.get("rating_sum", 0)) / rating_count, 2) if rating_count else 0.0
    return {
        "promptlet_id": p["promptlet_id"],
        "slug": p["slug"],
        "name": p["name"],
        "category": p["category"],
        "plan": p["plan"],
        "description": p["description"],
        "models": p["models"],
        "gradient": p["gradient"],
        "preview_image_url": p.get("preview_image_url"),
        "image_keyword": p.get("image_keyword", ""),
        "difficulty": p.get("difficulty", "Intermediate"),
        "credits_cost": int(p.get("credits_cost", 1)),
        "quality": int(p.get("quality", 4)),
        "creator": p.get("creator", "PromptAI Team"),
        "featured": bool(p.get("featured", False)),
        "version": int(p.get("version", 1)),
        "views": int(p.get("views", 0)),
        "downloads": int(p.get("downloads", 0)),
        "rating_avg": rating_avg,
        "rating_count": rating_count,
        # Hide the actual prompt text for locked promptlets in list responses.
        "prompt": None if locked else p["prompt"],
        "locked": locked,
    }


@api.get("/promptlets")
async def list_promptlets(
    request: Request,
    category: Optional[str] = Query(default=None),
    plan: Optional[str] = Query(default=None),
    model: Optional[str] = Query(default=None),
    difficulty: Optional[str] = Query(default=None),
    max_credits: Optional[int] = Query(default=None, ge=0, le=10),
    sort: Optional[str] = Query(default=None, description="popular | trending | newest | quality"),
    q: Optional[str] = Query(default=None),
):
    # Best-effort optional auth (so we can mark `locked` per user).
    user = None
    try:
        user = await get_current_user(request)
    except HTTPException:
        user = None

    mongo_filter: dict = {}
    if category and category.lower() != "all":
        mongo_filter["category"] = category
    if plan and plan.lower() in {"free", "pro"}:
        mongo_filter["plan"] = plan.lower()
    if model and model.lower() != "all":
        mongo_filter["models"] = model
    if difficulty and difficulty.lower() != "all":
        mongo_filter["difficulty"] = difficulty
    if max_credits is not None:
        mongo_filter["credits_cost"] = {"$lte": max_credits}
    if q:
        mongo_filter["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"category": {"$regex": q, "$options": "i"}},
            {"models": {"$regex": q, "$options": "i"}},
        ]

    docs = await db.promptlets.find(mongo_filter, {"_id": 0}).to_list(500)

    # Sort: popular=views, trending=downloads+rating, newest=created_at desc, quality=rating_avg
    def sort_key(d):
        rc = max(int(d.get("rating_count", 0)), 1)
        r_avg = float(d.get("rating_sum", 0)) / rc
        if sort == "popular":
            return -int(d.get("views", 0))
        if sort == "trending":
            return -(int(d.get("downloads", 0)) * 2 + int(d.get("views", 0)) // 20 + int(r_avg * 100))
        if sort == "newest":
            return d.get("created_at") or ""
        if sort == "quality":
            return -r_avg
        # default: featured first, then views
        return (0 if d.get("featured") else 1, -int(d.get("views", 0)))

    docs.sort(key=sort_key, reverse=(sort == "newest"))

    favorites: set = set()
    if user:
        fav_docs = await db.favorites.find({"user_id": user["user_id"]}, {"_id": 0, "promptlet_id": 1}).to_list(2000)
        favorites = {f["promptlet_id"] for f in fav_docs}

    items = []
    for d in docs:
        s = serialize_promptlet(d, user)
        s["favorited"] = s["promptlet_id"] in favorites
        items.append(s)
    categories = sorted({d["category"] for d in docs})
    return {"items": items, "categories": categories, "total": len(items)}


@api.get("/promptlets/{promptlet_id}")
async def get_promptlet(promptlet_id: str, user: dict = Depends(get_current_user)):
    p = await db.promptlets.find_one({"$or": [{"promptlet_id": promptlet_id}, {"slug": promptlet_id}]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Promptlet not found")
    if not can_access_promptlet(user, p):
        # Locked but we still let users SEE metadata on the detail page.
        out = serialize_promptlet(p, user)
        out["how_to_use"] = p.get("how_to_use", "")
        out["expected_output"] = p.get("expected_output", "")
        out["favorited"] = False
        return out

    fav = await db.favorites.find_one({"user_id": user["user_id"], "promptlet_id": p["promptlet_id"]})
    out = serialize_promptlet(p, user)
    out["favorited"] = bool(fav)
    out["how_to_use"] = p.get("how_to_use", "")
    out["expected_output"] = p.get("expected_output", "")
    return out


@api.get("/promptlets/{promptlet_id}/details")
async def get_promptlet_details(promptlet_id: str, user: dict = Depends(get_current_user)):
    p = await db.promptlets.find_one({"$or": [{"promptlet_id": promptlet_id}, {"slug": promptlet_id}]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Promptlet not found")

    # Increment view counter once per detail-fetch (best-effort, no auth req'd really).
    await db.promptlets.update_one({"slug": p["slug"]}, {"$inc": {"views": 1}})
    p["views"] = int(p.get("views", 0)) + 1

    base = serialize_promptlet(p, user)
    base["how_to_use"] = p.get("how_to_use", "")
    base["expected_output"] = p.get("expected_output", "")
    base["favorited"] = bool(await db.favorites.find_one({"user_id": user["user_id"], "promptlet_id": p["promptlet_id"]}))

    # User's own rating (if any)
    my_rating = await db.ratings.find_one({"user_id": user["user_id"], "promptlet_id": p["promptlet_id"]}, {"_id": 0})

    # Recent reviews (last 8 with text)
    review_docs = await (
        db.ratings.find(
            {"promptlet_id": p["promptlet_id"], "review": {"$exists": True, "$ne": ""}},
            {"_id": 0, "user_id": 1, "stars": 1, "review": 1, "created_at": 1, "user_name": 1},
        )
        .sort("created_at", -1)
        .to_list(8)
    )

    # Related = same category, exclude self, top-5 by views
    related_docs = await db.promptlets.find(
        {"category": p["category"], "slug": {"$ne": p["slug"]}},
        {"_id": 0},
    ).sort("views", -1).to_list(5)
    related = [serialize_promptlet(r, user) | {"favorited": False} for r in related_docs]

    # Version history (single seeded version + the current; can extend later).
    versions = [
        {"version": int(p.get("version", 1)), "label": "Current", "released_at": p.get("created_at"), "notes": "Initial production release."}
    ]
    return {
        "promptlet": base,
        "my_rating": my_rating,
        "reviews": review_docs,
        "related": related,
        "versions": versions,
    }


@api.post("/promptlets/{promptlet_id}/use")
async def use_promptlet(promptlet_id: str, user: dict = Depends(get_current_user)):
    p = await db.promptlets.find_one({"$or": [{"promptlet_id": promptlet_id}, {"slug": promptlet_id}]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Promptlet not found")
    if not can_access_promptlet(user, p):
        raise HTTPException(status_code=403, detail="Upgrade to Pro to use this promptlet")

    cost = int(p.get("credits_cost", PROMPT_USE_COST))
    user = await consume_credits(user, cost)

    # Increment downloads counter.
    await db.promptlets.update_one({"slug": p["slug"]}, {"$inc": {"downloads": 1, "views": 1}})

    history_doc = {
        "history_id": uuid.uuid4().hex,
        "user_id": user["user_id"],
        "kind": "marketplace_use",
        "promptlet_id": p["promptlet_id"],
        "promptlet_slug": p["slug"],
        "promptlet_name": p["name"],
        "category": p["category"],
        "model": (p.get("models") or [None])[0],
        "cost": cost,
        "created_at": now_iso(),
    }
    await db.prompt_history.insert_one(history_doc)
    return {
        "ok": True,
        "prompt": p["prompt"],
        "promptlet": serialize_promptlet(p, user),
        "credits": credit_summary(user),
        "cost": cost,
    }


@api.post("/promptlets/{promptlet_id}/rate")
async def rate_promptlet(promptlet_id: str, body: "RateBody", user: dict = Depends(get_current_user)):
    p = await db.promptlets.find_one({"$or": [{"promptlet_id": promptlet_id}, {"slug": promptlet_id}]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Promptlet not found")

    existing = await db.ratings.find_one({"user_id": user["user_id"], "promptlet_id": p["promptlet_id"]}, {"_id": 0})
    old_stars = int(existing.get("stars", 0)) if existing else 0

    rating_doc = {
        "user_id": user["user_id"],
        "user_name": user.get("name") or user.get("email", "").split("@")[0],
        "promptlet_id": p["promptlet_id"],
        "stars": int(body.stars),
        "review": (body.review or "").strip()[:1500],
        "created_at": now_iso(),
    }
    await db.ratings.update_one(
        {"user_id": user["user_id"], "promptlet_id": p["promptlet_id"]},
        {"$set": rating_doc},
        upsert=True,
    )
    inc_count = 0 if existing else 1
    inc_sum = int(body.stars) - old_stars
    await db.promptlets.update_one(
        {"slug": p["slug"]},
        {"$inc": {"rating_sum": inc_sum, "rating_count": inc_count}},
    )
    return {"ok": True}


@api.get("/promptlets/{promptlet_id}/reviews")
async def list_reviews(promptlet_id: str):
    p = await db.promptlets.find_one({"$or": [{"promptlet_id": promptlet_id}, {"slug": promptlet_id}]}, {"_id": 0, "promptlet_id": 1})
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    rows = await db.ratings.find(
        {"promptlet_id": p["promptlet_id"], "review": {"$exists": True, "$ne": ""}},
        {"_id": 0},
    ).sort("created_at", -1).to_list(100)
    return {"items": rows}


@api.post("/promptlets/{promptlet_id}/favorite")
async def toggle_favorite(promptlet_id: str, body: FavoriteBody, user: dict = Depends(get_current_user)):
    p = await db.promptlets.find_one({"promptlet_id": promptlet_id}, {"_id": 0, "promptlet_id": 1})
    if not p:
        raise HTTPException(status_code=404, detail="Promptlet not found")
    if body.favorite:
        await db.favorites.update_one(
            {"user_id": user["user_id"], "promptlet_id": promptlet_id},
            {"$set": {"created_at": now_iso()}},
            upsert=True,
        )
    else:
        await db.favorites.delete_one({"user_id": user["user_id"], "promptlet_id": promptlet_id})
    return {"ok": True, "favorited": body.favorite}


# ---------------------------------------------------------------------------
# User dashboard data
# ---------------------------------------------------------------------------
@api.get("/me/usage")
async def me_usage(user: dict = Depends(get_current_user)):
    user = await maybe_refill_credits(user)
    return credit_summary(user)


@api.get("/me/dashboard")
async def me_dashboard(user: dict = Depends(get_current_user)):
    user = await maybe_refill_credits(user)
    cred = credit_summary(user)
    # Recent history (last 8)
    recent = await db.prompt_history.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(8)
    # Favorites count
    fav_count = await db.favorites.count_documents({"user_id": user["user_id"]})
    saved_count = await db.saved_prompts.count_documents({"user_id": user["user_id"]})
    # 30-day rolling usage (count of history docs)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    monthly = await db.prompt_history.count_documents({"user_id": user["user_id"], "created_at": {"$gte": cutoff}})
    # Total prompts used (history rows)
    total = await db.prompt_history.count_documents({"user_id": user["user_id"]})
    # Favorite categories (top 3 by count in history)
    pipeline = [
        {"$match": {"user_id": user["user_id"]}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]
    cats = [{"category": row["_id"], "count": row["count"]} async for row in db.prompt_history.aggregate(pipeline) if row["_id"]]
    return {
        "credits": cred,
        "subscription": user.get("subscription", "free"),
        "total_used": total,
        "monthly_used": monthly,
        "favorite_categories": cats,
        "saved_prompts_count": saved_count,
        "favorites_count": fav_count,
        "recent_history": recent,
    }


@api.get("/me/favorites")
async def me_favorites(user: dict = Depends(get_current_user)):
    favs = await db.favorites.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    ids = [f["promptlet_id"] for f in favs]
    if not ids:
        return {"items": []}
    promptlets = await db.promptlets.find({"promptlet_id": {"$in": ids}}, {"_id": 0}).to_list(500)
    by_id = {p["promptlet_id"]: p for p in promptlets}
    items = []
    for f in favs:
        p = by_id.get(f["promptlet_id"])
        if not p:
            continue
        s = serialize_promptlet(p, user)
        s["favorited"] = True
        s["favorited_at"] = f["created_at"]
        items.append(s)
    return {"items": items}


@api.get("/me/history")
async def me_history(limit: int = 20, user: dict = Depends(get_current_user)):
    limit = max(1, min(100, limit))
    rows = await db.prompt_history.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return {"items": rows}


@api.post("/me/subscription")
async def update_subscription(body: UpgradeBody, user: dict = Depends(get_current_user)):
    # NOTE: stripe checkout integration will replace this; for MVP we let the
    # signed-in user flip their own plan so the gating UX is demonstrable.
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"subscription": body.plan}},
    )
    user["subscription"] = body.plan
    return {"ok": True, "subscription": body.plan, "credits": credit_summary(user)}


# ---------------------------------------------------------------------------
# Prompt Generator (LLM-powered)
# ---------------------------------------------------------------------------
@api.post("/generate/optimize")
async def optimize_prompt(body: OptimizeBody, user: dict = Depends(get_current_user)):
    # Lazy import so a missing key/library doesn't break unrelated routes.
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    if not llm_key:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    user = await maybe_refill_credits(user)
    # Pre-flight: ensure enough credits BEFORE calling the LLM, but don't charge yet.
    if user.get("subscription") != "pro":
        balance = int(user.get("credits_balance", 0))
        if balance < OPTIMIZE_COST:
            raise HTTPException(
                status_code=402,
                detail=(
                    f"Not enough credits. You need {OPTIMIZE_COST} but have {balance}. "
                    "Upgrade to Pro for unlimited credits."
                ),
            )

    system_message = (
        "You are PromptAI's prompt-engineering co-pilot. Given a user's plain-English "
        "idea, target AI model and category, produce a single, polished, production-ready "
        "prompt that is idiomatic for that model and category.\n\n"
        "Rules:\n"
        "- Output ONLY the optimized prompt, no preamble, no quotes, no commentary.\n"
        "- Use the conventions of the target model (e.g. /imagine + parameters for Midjourney, "
        "  natural-language instructions for ChatGPT/Claude/Gemini, JSON-output framing for coding).\n"
        "- Keep it under 220 words.\n"
        "- Preserve all proper nouns and any concrete details from the user's idea."
    )

    user_text = (
        f"Target model: {body.model}\n"
        f"Category: {body.category}\n"
        f"User idea:\n{body.idea.strip()}"
    )

    try:
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"optimize-{user['user_id']}-{uuid.uuid4().hex[:8]}",
            system_message=system_message,
        ).with_model("anthropic", "claude-sonnet-4-6")
        result = await chat.send_message(UserMessage(text=user_text))
    except Exception as exc:
        logger.exception("Optimizer call failed")
        raise HTTPException(status_code=502, detail=f"Optimizer is unavailable right now: {exc}")

    optimized = (result or "").strip()
    if not optimized:
        raise HTTPException(status_code=502, detail="Empty response from optimizer")

    # Charge credits AFTER a successful LLM response so failed calls are free.
    user = await consume_credits(user, OPTIMIZE_COST)

    history_doc = {
        "history_id": uuid.uuid4().hex,
        "user_id": user["user_id"],
        "kind": "optimize",
        "promptlet_name": (body.idea.strip().split("\n")[0][:80] or "Custom prompt"),
        "category": body.category,
        "model": body.model,
        "idea": body.idea.strip(),
        "prompt": optimized,
        "cost": OPTIMIZE_COST,
        "created_at": now_iso(),
    }
    await db.prompt_history.insert_one(history_doc)
    return {
        "ok": True,
        "prompt": optimized,
        "credits": credit_summary(user),
        "cost": OPTIMIZE_COST,
        "history_id": history_doc["history_id"],
    }


@api.post("/generate/save")
async def save_generated(body: SavePromptBody, user: dict = Depends(get_current_user)):
    doc = {
        "saved_id": uuid.uuid4().hex,
        "user_id": user["user_id"],
        "name": body.name.strip()[:120] or "Untitled prompt",
        "prompt": body.prompt.strip(),
        "model": body.model,
        "category": body.category,
        "idea": (body.idea or "").strip(),
        "created_at": now_iso(),
    }
    await db.saved_prompts.insert_one(doc)
    return {"ok": True, "saved_id": doc["saved_id"]}


@api.get("/me/saved-prompts")
async def list_saved_prompts(user: dict = Depends(get_current_user)):
    rows = await db.saved_prompts.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"items": rows}


@api.delete("/me/saved-prompts/{saved_id}")
async def delete_saved_prompt(saved_id: str, user: dict = Depends(get_current_user)):
    res = await db.saved_prompts.delete_one({"saved_id": saved_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Collections
# ---------------------------------------------------------------------------
async def _resolve_collection(coll: dict, user: Optional[dict]) -> dict:
    """Resolve a collection's promptlets and merge in display info."""
    mongo_filter: dict = {}
    if coll.get("slugs"):
        mongo_filter["slug"] = {"$in": coll["slugs"]}
    elif coll.get("model"):
        mongo_filter["models"] = coll["model"]
    elif coll.get("categories"):
        mongo_filter["category"] = {"$in": coll["categories"]}
    docs = await db.promptlets.find(mongo_filter, {"_id": 0}).to_list(200)
    favorites: set = set()
    if user:
        fav_docs = await db.favorites.find({"user_id": user["user_id"]}, {"_id": 0, "promptlet_id": 1}).to_list(2000)
        favorites = {f["promptlet_id"] for f in fav_docs}
    items = []
    for d in docs:
        s = serialize_promptlet(d, user)
        s["favorited"] = s["promptlet_id"] in favorites
        items.append(s)
    items.sort(key=lambda x: -int(x.get("views", 0)))
    return {**{k: v for k, v in coll.items() if k != "_id"}, "items": items, "count": len(items)}


@api.get("/collections")
async def list_collections(request: Request):
    # No user-specific data needed in the index view; auth is unused here.
    coll_docs = await db.collections.find({}, {"_id": 0}).sort("created_at", 1).to_list(100)
    out = []
    for c in coll_docs:
        # only include lightweight items count for the index view
        if c.get("slugs"):
            count = await db.promptlets.count_documents({"slug": {"$in": c["slugs"]}})
        elif c.get("model"):
            count = await db.promptlets.count_documents({"models": c["model"]})
        elif c.get("categories"):
            count = await db.promptlets.count_documents({"category": {"$in": c["categories"]}})
        else:
            count = 0
        out.append({**c, "count": count})
    return {"items": out}


@api.get("/collections/{slug}")
async def get_collection(slug: str, request: Request):
    user = None
    try:
        user = await get_current_user(request)
    except HTTPException:
        user = None
    c = await db.collections.find_one({"slug": slug}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Collection not found")
    return await _resolve_collection(c, user)


# ---------------------------------------------------------------------------
# Community: follows, trending
# ---------------------------------------------------------------------------
@api.post("/community/follow")
async def follow_creator(body: FollowBody, user: dict = Depends(get_current_user)):
    await db.follows.update_one(
        {"user_id": user["user_id"], "creator": body.creator.strip()},
        {"$set": {"created_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True, "following": True}


@api.delete("/community/follow/{creator}")
async def unfollow_creator(creator: str, user: dict = Depends(get_current_user)):
    await db.follows.delete_one({"user_id": user["user_id"], "creator": creator})
    return {"ok": True, "following": False}


@api.get("/community/follows")
async def list_follows(user: dict = Depends(get_current_user)):
    rows = await db.follows.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(200)
    return {"items": rows}


@api.get("/community/trending")
async def community_trending(request: Request):
    user = None
    try:
        user = await get_current_user(request)
    except HTTPException:
        user = None
    docs = await db.promptlets.find({}, {"_id": 0}).to_list(500)

    def score(d):
        rc = max(int(d.get("rating_count", 0)), 1)
        r_avg = float(d.get("rating_sum", 0)) / rc
        return int(d.get("downloads", 0)) * 2 + int(d.get("views", 0)) // 20 + int(r_avg * 100)

    docs.sort(key=score, reverse=True)
    items = [serialize_promptlet(d, user) | {"favorited": False, "score": score(d)} for d in docs[:12]]
    return {"items": items}


# ---------------------------------------------------------------------------
# Prompt Converter (LLM)
# ---------------------------------------------------------------------------
CONVERT_COST = 3


@api.post("/convert")
async def convert_prompt(body: ConvertBody, user: dict = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    if not llm_key:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    user = await maybe_refill_credits(user)
    if user.get("subscription") != "pro":
        balance = int(user.get("credits_balance", 0))
        if balance < CONVERT_COST:
            raise HTTPException(status_code=402, detail=f"Need {CONVERT_COST} credits, have {balance}.")

    system_message = (
        "You are PromptAI's prompt converter. Convert a prompt written for one AI model "
        "into the idiomatic, production-ready form for a different AI model.\n\n"
        "Rules:\n"
        "- Output ONLY the converted prompt. No preamble, no quotes, no commentary.\n"
        "- Honor the syntax of the TARGET model (e.g. /imagine + --ar/--v parameters for "
        "Midjourney; natural instructions for ChatGPT/Claude/Gemini; JSON-output framing for "
        "coding/agent models).\n"
        "- Preserve all concrete details and intent from the original prompt.\n"
        "- Keep under 240 words."
    )
    user_text = (
        f"SOURCE MODEL: {body.source_model}\n"
        f"TARGET MODEL: {body.target_model}\n\n"
        f"ORIGINAL PROMPT:\n{body.prompt.strip()}"
    )
    try:
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"convert-{user['user_id']}-{uuid.uuid4().hex[:8]}",
            system_message=system_message,
        ).with_model("anthropic", "claude-sonnet-4-6")
        result = await chat.send_message(UserMessage(text=user_text))
    except Exception as exc:
        logger.exception("Converter call failed")
        raise HTTPException(status_code=502, detail=f"Converter is unavailable right now: {exc}")

    converted = (result or "").strip()
    if not converted:
        raise HTTPException(status_code=502, detail="Empty response from converter")

    user = await consume_credits(user, CONVERT_COST)

    history_doc = {
        "history_id": uuid.uuid4().hex,
        "user_id": user["user_id"],
        "kind": "convert",
        "promptlet_name": f"Convert {body.source_model} → {body.target_model}",
        "category": "Convert",
        "model": body.target_model,
        "idea": body.prompt.strip()[:200],
        "prompt": converted,
        "cost": CONVERT_COST,
        "created_at": now_iso(),
    }
    await db.prompt_history.insert_one(history_doc)
    return {
        "ok": True,
        "prompt": converted,
        "credits": credit_summary(user),
        "cost": CONVERT_COST,
    }


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------
async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


@api.get("/admin/analytics")
async def admin_analytics(_admin: dict = Depends(require_admin)):
    total_users = await db.users.count_documents({})
    pro_users = await db.users.count_documents({"subscription": "pro"})
    verified = await db.users.count_documents({"email_verified": True})
    total_prompts = await db.prompt_history.count_documents({})
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    monthly_prompts = await db.prompt_history.count_documents({"created_at": {"$gte": cutoff}})
    total_promptlets = await db.promptlets.count_documents({})
    featured = await db.promptlets.count_documents({"featured": True})
    waitlist = await db.newsletter.count_documents({})
    contacts = await db.contact_submissions.count_documents({})

    # Credits used (sum)
    pipe = [{"$group": {"_id": None, "n": {"$sum": "$cost"}}}]
    credits_used = 0
    async for row in db.prompt_history.aggregate(pipe):
        credits_used = int(row.get("n") or 0)

    # Top promptlets (by downloads)
    top = await db.promptlets.find({}, {"_id": 0, "slug": 1, "name": 1, "downloads": 1, "views": 1, "category": 1}).sort("downloads", -1).to_list(8)

    # Top categories
    cat_pipe = [
        {"$group": {"_id": "$category", "n": {"$sum": 1}}},
        {"$sort": {"n": -1}},
    ]
    top_categories = []
    async for row in db.prompt_history.aggregate(cat_pipe):
        if row["_id"]:
            top_categories.append({"category": row["_id"], "count": row["n"]})

    # Recent signups
    recent_users = await db.users.find({}, {"_id": 0, "user_id": 1, "email": 1, "name": 1, "subscription": 1, "created_at": 1}).sort("created_at", -1).to_list(8)

    return {
        "totals": {
            "users": total_users,
            "pro_users": pro_users,
            "verified_users": verified,
            "promptlets": total_promptlets,
            "featured_promptlets": featured,
            "prompts": total_prompts,
            "monthly_prompts": monthly_prompts,
            "credits_used": credits_used,
            "waitlist": waitlist,
            "contact_messages": contacts,
        },
        "top_promptlets": top,
        "top_categories": top_categories,
        "recent_users": recent_users,
    }


@api.get("/admin/promptlets")
async def admin_list_promptlets(_admin: dict = Depends(require_admin)):
    docs = await db.promptlets.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"items": docs}


@api.post("/admin/promptlets")
async def admin_create_promptlet(body: AdminPromptletBody, _admin: dict = Depends(require_admin)):
    slug = (body.slug or body.name.lower().replace(" ", "-"))
    slug = "".join(ch if ch.isalnum() or ch == "-" else "" for ch in slug)
    if not slug:
        raise HTTPException(status_code=400, detail="Could not derive slug")
    if await db.promptlets.find_one({"slug": slug}):
        raise HTTPException(status_code=400, detail="Slug already exists")
    defaults = CATEGORY_DEFAULTS.get(body.category, {})
    doc = body.model_dump()
    doc["slug"] = slug
    doc["promptlet_id"] = f"plet_{slug}"
    doc["image_keyword"] = body.category
    if not doc.get("preview_image_url"):
        doc["preview_image_url"] = cover_image(defaults.get("image_seed", "1502920917128-1aa500764cbd"))
    if not doc.get("gradient"):
        doc["gradient"] = ["#0EA5E9", "#3B82F6"]
    if not doc.get("how_to_use"):
        doc["how_to_use"] = HOW_TO_USE_BY_CATEGORY.get(body.category, "")
    if not doc.get("expected_output"):
        doc["expected_output"] = EXPECTED_OUTPUT_BY_CATEGORY.get(body.category, "")
    doc["creator"] = "PromptAI Team"
    doc["version"] = 1
    doc["views"] = 0
    doc["downloads"] = 0
    doc["rating_sum"] = 0.0
    doc["rating_count"] = 0
    doc["created_at"] = now_iso()
    await db.promptlets.insert_one(doc)
    return {"ok": True, "slug": slug}


@api.patch("/admin/promptlets/{slug}")
async def admin_update_promptlet(slug: str, body: AdminPromptletBody, _admin: dict = Depends(require_admin)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    update.pop("slug", None)
    update["version"] = int(update.get("version", 1)) + 1 if update else 1
    res = await db.promptlets.update_one({"slug": slug}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@api.delete("/admin/promptlets/{slug}")
async def admin_delete_promptlet(slug: str, _admin: dict = Depends(require_admin)):
    res = await db.promptlets.delete_one({"slug": slug})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@api.post("/admin/promptlets/{slug}/feature")
async def admin_toggle_feature(slug: str, _admin: dict = Depends(require_admin)):
    p = await db.promptlets.find_one({"slug": slug}, {"_id": 0, "featured": 1})
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    await db.promptlets.update_one({"slug": slug}, {"$set": {"featured": not p.get("featured", False)}})
    return {"ok": True, "featured": not p.get("featured", False)}


@api.get("/admin/users")
async def admin_list_users(q: Optional[str] = None, _admin: dict = Depends(require_admin)):
    f: dict = {}
    if q:
        f["$or"] = [{"email": {"$regex": q, "$options": "i"}}, {"name": {"$regex": q, "$options": "i"}}]
    docs = await db.users.find(f, {"_id": 0, "password_hash": 0, "email_verification_token": 0}).sort("created_at", -1).to_list(500)
    return {"items": docs}


@api.patch("/admin/users/{user_id}")
async def admin_update_user(user_id: str, body: AdminUserPatchBody, _admin: dict = Depends(require_admin)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        return {"ok": True}
    res = await db.users.update_one({"user_id": user_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


@api.get("/admin/categories")
async def admin_list_categories(_admin: dict = Depends(require_admin)):
    rows = await db.categories.find({}, {"_id": 0}).sort("name", 1).to_list(500)
    return {"items": rows}


@api.post("/admin/categories")
async def admin_upsert_category(body: AdminCategoryBody, _admin: dict = Depends(require_admin)):
    await db.categories.update_one(
        {"name": body.name},
        {"$set": {"name": body.name, "active": body.active}, "$setOnInsert": {"created_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True}


@api.delete("/admin/categories/{name}")
async def admin_delete_category(name: str, _admin: dict = Depends(require_admin)):
    await db.categories.delete_one({"name": name})
    return {"ok": True}


@api.get("/admin/collections")
async def admin_list_collections(_admin: dict = Depends(require_admin)):
    rows = await db.collections.find({}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return {"items": rows}


@api.post("/admin/collections")
async def admin_upsert_collection(body: AdminCollectionBody, _admin: dict = Depends(require_admin)):
    doc = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.collections.update_one(
        {"slug": body.slug},
        {"$set": doc, "$setOnInsert": {"created_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True}


@api.delete("/admin/collections/{slug}")
async def admin_delete_collection(slug: str, _admin: dict = Depends(require_admin)):
    await db.collections.delete_one({"slug": slug})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.newsletter.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("token", unique=True)
    await db.promptlets.create_index("slug", unique=True)
    await db.promptlets.create_index("category")
    await db.favorites.create_index([("user_id", 1), ("promptlet_id", 1)], unique=True)
    await db.prompt_history.create_index([("user_id", 1), ("created_at", -1)])
    await db.saved_prompts.create_index([("user_id", 1), ("created_at", -1)])
    await db.saved_prompts.create_index("saved_id", unique=True)
    await db.collections.create_index("slug", unique=True)
    await db.categories.create_index("name", unique=True)
    await db.ratings.create_index([("user_id", 1), ("promptlet_id", 1)], unique=True)
    await db.follows.create_index([("user_id", 1), ("creator", 1)], unique=True)
    await migrate_users_to_credits()
    await seed_admin()
    await seed_promptlets()
    await seed_collections()
    await seed_categories()


async def migrate_users_to_credits():
    """One-shot migration: backfill credit fields on any user missing them."""
    cursor = db.users.find({"credits_balance": {"$exists": False}}, {"_id": 0, "user_id": 1})
    async for u in cursor:
        await db.users.update_one(
            {"user_id": u["user_id"]},
            {
                "$set": {
                    "credits_balance": FREE_REFILL_AMOUNT,
                    "credits_used": 0,
                    "next_credit_date": None,
                },
                "$unset": {"prompts_used": "", "usage_period_start": ""},
            },
        )


async def seed_promptlets():
    """Idempotent upsert of the curated promptlet catalogue (with enriched fields)."""
    for item in PROMPTLETS:
        slug = item["slug"]
        category = item["category"]
        defaults = CATEGORY_DEFAULTS.get(category, {})
        # Deterministic demo stats so the same slug always shows the same numbers.
        h = int(hashlib.md5(slug.encode()).hexdigest(), 16)
        views = 280 + (h % 9700)
        downloads = 18 + (h % 1900)
        rating_demo = round(4.2 + ((h % 7) / 10.0), 1)  # 4.2 – 4.8
        quality = 3 + ((h >> 8) % 3)                   # 3, 4 or 5
        version = 1
        doc = {
            "promptlet_id": f"plet_{slug}",
            "slug": slug,
            "name": item["name"],
            "category": category,
            "plan": item["plan"],
            "description": item["description"],
            "prompt": item["prompt"],
            "models": item["models"],
            "gradient": item["gradient"],
            "image_keyword": item.get("image_keyword", ""),
            "preview_image_url": item.get("preview_image_url") or cover_image(defaults.get("image_seed", "1502920917128-1aa500764cbd")),
            "difficulty": item.get("difficulty") or defaults.get("difficulty", "Intermediate"),
            "credits_cost": int(item.get("credits_cost") or defaults.get("credits", 1)),
            "quality": int(item.get("quality") or quality),
            "how_to_use": item.get("how_to_use") or HOW_TO_USE_BY_CATEGORY.get(category, ""),
            "expected_output": item.get("expected_output") or EXPECTED_OUTPUT_BY_CATEGORY.get(category, ""),
            "creator": item.get("creator") or "PromptAI Team",
            "featured": bool(item.get("featured", False)),
            "version": item.get("version", version),
        }
        await db.promptlets.update_one(
            {"slug": slug},
            {
                "$set": doc,
                "$setOnInsert": {"created_at": now_iso()},
            },
            upsert=True,
        )
        # Backfill demo counters on existing docs that pre-date this iteration.
        await db.promptlets.update_one(
            {"slug": slug, "views": {"$exists": False}},
            {"$set": {"views": views, "downloads": downloads, "rating_sum": rating_demo * 18, "rating_count": 18}},
        )


async def seed_collections():
    for c in COLLECTIONS:
        await db.collections.update_one(
            {"slug": c["slug"]},
            {"$set": c, "$setOnInsert": {"created_at": now_iso()}},
            upsert=True,
        )


async def seed_categories():
    cats = sorted({p["category"] for p in PROMPTLETS})
    for name in cats:
        await db.categories.update_one(
            {"name": name},
            {"$set": {"name": name, "active": True}, "$setOnInsert": {"created_at": now_iso()}},
            upsert=True,
        )


async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@promptai.app").lower().strip()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@PromptAI2025")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": admin_email,
            "name": "PromptAI Admin",
            "password_hash": hash_password(admin_password),
            "provider": "email",
            "role": "admin",
            "picture": None,
            "subscription": "pro",
            "credits_balance": FREE_REFILL_AMOUNT,
            "credits_used": 0,
            "next_credit_date": None,
            "email_verified": True,
            "created_at": now_iso(),
        })
        logger.info("Seeded admin user %s", admin_email)
    elif existing.get("password_hash") and not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}},
        )
        logger.info("Updated admin password for %s", admin_email)


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ---------------------------------------------------------------------------
# CORS + mount router
# ---------------------------------------------------------------------------
app.include_router(api)

cors_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", FRONTEND_URL).split(",") if o.strip()]
# allow_origins=["*"] is incompatible with credentialed cookies — use a regex
# fallback so cross-origin auth keeps working when the operator sets a wildcard.
if "*" in cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
