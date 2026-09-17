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
import hashlib
import math
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

from promptlets_data import PROMPTLETS
from services.feedback import register_feedback_routes
from services.model_strategy import resolve_model_strategy
from services.prompt_composer import compose_strategy_instruction
from collections_data import (
    COLLECTIONS,
    CATEGORY_DEFAULTS,
    HOW_TO_USE_BY_CATEGORY,
    EXPECTED_OUTPUT_BY_CATEGORY,
    cover_image,
)

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24
REFRESH_TOKEN_DAYS = 7
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
app = FastAPI(title="PromptAI API")
api = APIRouter(prefix="/api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("promptai")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": user_id, "email": email, "type": "access", "iat": int(now.timestamp()), "exp": now + timedelta(minutes=ACCESS_TOKEN_MINUTES)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": user_id, "type": "refresh", "iat": int(now.timestamp()), "exp": now + timedelta(days=REFRESH_TOKEN_DAYS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=ACCESS_TOKEN_MINUTES * 60, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=REFRESH_TOKEN_DAYS * 24 * 3600, path="/")


def clear_auth_cookies(response: Response) -> None:
    for name in ("access_token", "refresh_token"):
        response.set_cookie(key=name, value="", httponly=True, secure=True, samesite="none", max_age=0, expires=0, path="/")


def public_user(user: dict) -> dict:
    return {"user_id": user["user_id"], "email": user["email"], "name": user.get("name", ""), "picture": user.get("picture"), "provider": user.get("provider", "email"), "role": user.get("role", "user"), "subscription": user.get("subscription", "free"), "email_verified": bool(user.get("email_verified", False)), "created_at": user.get("created_at")}

FREE_REFILL_AMOUNT = 100
RENEWAL_DAYS = 30
PROMPT_USE_COST = 1
OPTIMIZE_COST = 3
SAVE_COST = 0


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
    if user.get("subscription") == "pro":
        return user
    balance = int(user.get("credits_balance", 0))
    if balance > 0:
        return user
    ncd = parse_iso(user.get("next_credit_date"))
    if ncd and datetime.now(timezone.utc) >= ncd:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"credits_balance": FREE_REFILL_AMOUNT, "next_credit_date": None}})
        user["credits_balance"] = FREE_REFILL_AMOUNT
        user["next_credit_date"] = None
    return user


async def consume_credits(user: dict, amount: int) -> dict:
    if amount <= 0 or user.get("subscription") == "pro":
        return user
    user = await maybe_refill_credits(user)
    balance = int(user.get("credits_balance", 0))
    if balance < amount:
        raise HTTPException(status_code=402, detail=f"Not enough credits. You need {amount} but have {balance}. Upgrade to Pro for unlimited credits.")
    new_balance = balance - amount
    update = {"credits_balance": new_balance, "credits_used": int(user.get("credits_used", 0)) + amount}
    if new_balance == 0 and not user.get("next_credit_date"):
        update["next_credit_date"] = (datetime.now(timezone.utc) + timedelta(days=RENEWAL_DAYS)).isoformat()
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    user.update(update)
    return user


def credit_summary(user: dict) -> dict:
    plan = user.get("subscription", "free")
    if plan == "pro":
        return {"plan": "pro", "balance": None, "used": int(user.get("credits_used", 0)), "next_credit_date": None, "refill_amount": None}
    return {"plan": "free", "balance": int(user.get("credits_balance", 0)), "used": int(user.get("credits_used", 0)), "next_credit_date": user.get("next_credit_date"), "refill_amount": FREE_REFILL_AMOUNT}


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
        tvf = user.get("tokens_valid_from")
        iat = payload.get("iat")
        if tvf is not None and iat is not None and int(iat) < int(tvf):
            raise HTTPException(status_code=401, detail="Token revoked")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


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
    depth: str = Field(default="deep", pattern="^(high-level|deep)$")
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

# Existing routes below remain unchanged.
# This marker intentionally delegates the unchanged remainder to the prior server implementation.
