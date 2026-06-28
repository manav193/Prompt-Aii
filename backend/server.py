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
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

from promptlets_data import PROMPTLETS

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
    return {
        "promptlet_id": p["promptlet_id"],
        "slug": p["slug"],
        "name": p["name"],
        "category": p["category"],
        "plan": p["plan"],
        "description": p["description"],
        "models": p["models"],
        "gradient": p["gradient"],
        "image_keyword": p.get("image_keyword", ""),
        # Hide the actual prompt text for locked promptlets in list responses.
        "prompt": None if locked else p["prompt"],
        "locked": locked,
    }


@api.get("/promptlets")
async def list_promptlets(
    request: Request,
    category: Optional[str] = Query(default=None),
    plan: Optional[str] = Query(default=None),
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
    if q:
        mongo_filter["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"category": {"$regex": q, "$options": "i"}},
        ]

    docs = await db.promptlets.find(mongo_filter, {"_id": 0}).to_list(500)
    favorites: set = set()
    if user:
        fav_docs = await db.favorites.find({"user_id": user["user_id"]}, {"_id": 0, "promptlet_id": 1}).to_list(1000)
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
    p = await db.promptlets.find_one({"promptlet_id": promptlet_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Promptlet not found")
    if not can_access_promptlet(user, p):
        raise HTTPException(status_code=403, detail="Upgrade to Pro to access this promptlet")
    fav = await db.favorites.find_one({"user_id": user["user_id"], "promptlet_id": promptlet_id})
    out = serialize_promptlet(p, user)
    out["favorited"] = bool(fav)
    return out


@api.post("/promptlets/{promptlet_id}/use")
async def use_promptlet(promptlet_id: str, user: dict = Depends(get_current_user)):
    p = await db.promptlets.find_one({"promptlet_id": promptlet_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Promptlet not found")
    if not can_access_promptlet(user, p):
        raise HTTPException(status_code=403, detail="Upgrade to Pro to use this promptlet")

    user = await consume_credits(user, PROMPT_USE_COST)

    history_doc = {
        "history_id": uuid.uuid4().hex,
        "user_id": user["user_id"],
        "kind": "marketplace_use",
        "promptlet_id": promptlet_id,
        "promptlet_slug": p["slug"],
        "promptlet_name": p["name"],
        "category": p["category"],
        "model": (p.get("models") or [None])[0],
        "cost": PROMPT_USE_COST,
        "created_at": now_iso(),
    }
    await db.prompt_history.insert_one(history_doc)
    return {
        "ok": True,
        "prompt": p["prompt"],
        "promptlet": serialize_promptlet(p, user),
        "credits": credit_summary(user),
        "cost": PROMPT_USE_COST,
    }


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

    user = await consume_credits(user, OPTIMIZE_COST)

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
    await migrate_users_to_credits()
    await seed_admin()
    await seed_promptlets()


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
    """Idempotent upsert of the curated promptlet catalogue."""
    for item in PROMPTLETS:
        doc = {
            "promptlet_id": f"plet_{item['slug']}",
            "slug": item["slug"],
            "name": item["name"],
            "category": item["category"],
            "plan": item["plan"],
            "description": item["description"],
            "prompt": item["prompt"],
            "models": item["models"],
            "gradient": item["gradient"],
            "image_keyword": item.get("image_keyword", ""),
        }
        await db.promptlets.update_one(
            {"slug": item["slug"]},
            {"$set": doc, "$setOnInsert": {"created_at": now_iso()}},
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
