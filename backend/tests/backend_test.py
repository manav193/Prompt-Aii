"""End-to-end backend tests for PromptAI iteration 4 (credit system).

Schema reminder:
  /api/me/usage    -> {plan, balance, used, next_credit_date, refill_amount}
  /api/promptlets/{id}/use -> {ok, prompt, credits, cost, promptlet}
  /api/generate/optimize  -> {ok, prompt, credits, cost, history_id}
"""
import os
import re
import time
import uuid
import asyncio
from datetime import datetime, timezone, timedelta

import pytest
import requests
from motor.motor_asyncio import AsyncIOMotorClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://prompt-craft-demo.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@promptai.app"
ADMIN_PASSWORD = "Admin@PromptAI2025"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


def _new_email():
    return f"test_{uuid.uuid4().hex[:10]}@example.com"


def _tail_backend_log(pattern: str, attempts: int = 8, sleep: float = 0.5):
    log_paths = ["/var/log/supervisor/backend.err.log", "/var/log/supervisor/backend.out.log"]
    rx = re.compile(pattern)
    for _ in range(attempts):
        for p in log_paths:
            try:
                with open(p, "r", errors="ignore") as f:
                    lines = f.readlines()[-600:]
            except FileNotFoundError:
                continue
            for line in reversed(lines):
                m = rx.search(line)
                if m:
                    return m
        time.sleep(sleep)
    return None


def _mongo_set(email: str, fields: dict):
    """Synchronously poke a user doc via motor."""
    async def _run():
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        res = await db.users.update_one({"email": email.lower()}, {"$set": fields})
        client.close()
        return res.modified_count
    return asyncio.run(_run())


# --------------- Health ---------------
def test_health():
    r = requests.get(f"{API}/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# --------------- Usage shape (new credit schema) ---------------
class TestUsageShape:
    def test_free_user_usage_shape(self):
        s = requests.Session()
        email = _new_email()
        r = s.post(f"{API}/auth/register", json={"name": "U", "email": email, "password": "Passw0rd!Test"})
        assert r.status_code == 200, r.text
        u = s.get(f"{API}/me/usage").json()
        assert set(u.keys()) >= {"plan", "balance", "used", "next_credit_date", "refill_amount"}
        assert u["plan"] == "free"
        assert u["balance"] == 100
        assert u["used"] == 0
        assert u["next_credit_date"] is None
        assert u["refill_amount"] == 100

    def test_pro_user_usage_shape(self):
        s = requests.Session()
        email = _new_email()
        s.post(f"{API}/auth/register", json={"name": "U", "email": email, "password": "Passw0rd!Test"})
        up = s.post(f"{API}/me/subscription", json={"plan": "pro"})
        assert up.status_code == 200
        u = s.get(f"{API}/me/usage").json()
        assert u["plan"] == "pro"
        assert u["balance"] is None
        assert u["refill_amount"] is None
        assert u["next_credit_date"] is None


# --------------- Marketplace use decrements 1 credit (free) ---------------
class TestPromptletUse:
    def test_free_use_decrements_one(self):
        s = requests.Session()
        email = _new_email()
        s.post(f"{API}/auth/register", json={"name": "U", "email": email, "password": "Passw0rd!Test"})
        items = s.get(f"{API}/promptlets").json()["items"]
        free_item = next(i for i in items if i["plan"] == "free")
        r = s.post(f"{API}/promptlets/{free_item['promptlet_id']}/use")
        assert r.status_code == 200, r.text
        body = r.json()
        assert "credits" in body and "usage" not in body
        assert body["credits"]["balance"] == 99
        assert body["credits"]["used"] == 1
        assert body["prompt"]

    def test_pro_use_no_decrement(self):
        s = requests.Session()
        email = _new_email()
        s.post(f"{API}/auth/register", json={"name": "U", "email": email, "password": "Passw0rd!Test"})
        s.post(f"{API}/me/subscription", json={"plan": "pro"})
        items = s.get(f"{API}/promptlets").json()["items"]
        pro_item = next(i for i in items if i["plan"] == "pro")
        r = s.post(f"{API}/promptlets/{pro_item['promptlet_id']}/use")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["credits"]["plan"] == "pro"
        assert body["credits"]["balance"] is None


# --------------- Credit refill rule (manual mongo poke) ---------------
class TestCreditRefill:
    def test_refill_after_countdown_expires(self):
        s = requests.Session()
        email = _new_email()
        r = s.post(f"{API}/auth/register", json={"name": "U", "email": email, "password": "Passw0rd!Test"})
        assert r.status_code == 200
        # Force balance=0 and next_credit_date in the past
        past = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
        modified = _mongo_set(email, {"credits_balance": 0, "next_credit_date": past})
        assert modified == 1, "mongo update did not affect user (check MONGO_URL/DB_NAME)"
        u = s.get(f"{API}/me/usage").json()
        assert u["balance"] == 100, f"expected refill to 100, got {u}"
        assert u["next_credit_date"] is None

    def test_no_refill_while_countdown_future(self):
        s = requests.Session()
        email = _new_email()
        s.post(f"{API}/auth/register", json={"name": "U", "email": email, "password": "Passw0rd!Test"})
        future = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
        _mongo_set(email, {"credits_balance": 0, "next_credit_date": future})
        u = s.get(f"{API}/me/usage").json()
        assert u["balance"] == 0
        assert u["next_credit_date"] is not None

    def test_pro_user_never_refilled_or_decremented(self):
        s = requests.Session()
        email = _new_email()
        s.post(f"{API}/auth/register", json={"name": "U", "email": email, "password": "Passw0rd!Test"})
        s.post(f"{API}/me/subscription", json={"plan": "pro"})
        # Pro use shouldn't change anything
        items = s.get(f"{API}/promptlets").json()["items"]
        pid = next(i for i in items if i["plan"] == "pro")["promptlet_id"]
        s.post(f"{API}/promptlets/{pid}/use")
        u = s.get(f"{API}/me/usage").json()
        assert u["plan"] == "pro"
        assert u["balance"] is None


# --------------- Dashboard shape ---------------
class TestDashboardShape:
    def test_dashboard_new_shape(self):
        s = requests.Session()
        email = _new_email()
        s.post(f"{API}/auth/register", json={"name": "U", "email": email, "password": "Passw0rd!Test"})
        d = s.get(f"{API}/me/dashboard").json()
        for key in ("credits", "subscription", "total_used", "monthly_used",
                    "favorite_categories", "saved_prompts_count", "favorites_count", "recent_history"):
            assert key in d, f"missing key {key}"
        assert d["credits"]["plan"] == "free"
        assert d["credits"]["balance"] == 100
        assert isinstance(d["favorite_categories"], list)
        assert isinstance(d["recent_history"], list)


# --------------- Save / list / delete generated prompts ---------------
class TestSavedPrompts:
    def test_save_list_delete(self):
        s = requests.Session()
        email = _new_email()
        s.post(f"{API}/auth/register", json={"name": "U", "email": email, "password": "Passw0rd!Test"})
        # save 2
        for n in ["TEST_prompt_a", "TEST_prompt_b"]:
            r = s.post(f"{API}/generate/save", json={
                "name": n, "prompt": "Hello world prompt body", "model": "ChatGPT",
                "category": "Writing", "idea": "say hi"
            })
            assert r.status_code == 200, r.text
            time.sleep(0.05)
        # list newest first
        lst = s.get(f"{API}/me/saved-prompts").json()["items"]
        assert len(lst) >= 2
        assert lst[0]["name"] == "TEST_prompt_b"
        # delete first
        sid = lst[0]["saved_id"]
        d = s.delete(f"{API}/me/saved-prompts/{sid}")
        assert d.status_code == 200
        lst2 = s.get(f"{API}/me/saved-prompts").json()["items"]
        assert not any(i["saved_id"] == sid for i in lst2)
        # 404 for unknown
        d404 = s.delete(f"{API}/me/saved-prompts/does-not-exist")
        assert d404.status_code == 404


# --------------- Optimize (LLM) ---------------
class TestOptimize:
    def test_optimize_decrements_and_persists_history(self):
        s = requests.Session()
        email = _new_email()
        s.post(f"{API}/auth/register", json={"name": "U", "email": email, "password": "Passw0rd!Test"})
        before = s.get(f"{API}/me/usage").json()
        r = s.post(f"{API}/generate/optimize", json={
            "idea": "A glowing futuristic city at sunset",
            "model": "Midjourney",
            "category": "Photo",
        }, timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        assert isinstance(body["prompt"], str) and len(body["prompt"]) > 0
        assert body["cost"] == 3
        assert body["credits"]["balance"] == before["balance"] - 3
        # history persists with kind=optimize
        hist = s.get(f"{API}/me/history").json()["items"]
        assert hist, "history empty"
        latest = hist[0]
        assert latest["kind"] == "optimize"
        assert latest["model"] == "Midjourney"
        assert latest["category"] == "Photo"
        assert latest["cost"] == 3
        assert latest.get("prompt")

    def test_optimize_402_when_insufficient(self):
        s = requests.Session()
        email = _new_email()
        s.post(f"{API}/auth/register", json={"name": "U", "email": email, "password": "Passw0rd!Test"})
        # leave only 2 credits
        _mongo_set(email, {"credits_balance": 2})
        r = s.post(f"{API}/generate/optimize", json={
            "idea": "test", "model": "ChatGPT", "category": "Writing"
        }, timeout=30)
        assert r.status_code == 402, r.text


# --------------- Migration: legacy users get backfilled ---------------
class TestMigration:
    def test_legacy_user_gets_backfilled(self):
        """Insert a user with old fields, restart not required because migration is
        startup-only. So we simulate by checking that all current users in db
        have credit fields and no legacy fields."""
        async def _check():
            client = AsyncIOMotorClient(MONGO_URL)
            db = client[DB_NAME]
            cur = db.users.find({}, {"_id": 0, "user_id": 1, "credits_balance": 1,
                                     "credits_used": 1, "next_credit_date": 1,
                                     "prompts_used": 1, "usage_period_start": 1})
            bad = []
            async for u in cur:
                if "credits_balance" not in u:
                    bad.append(("missing_credits_balance", u["user_id"]))
                if "prompts_used" in u or "usage_period_start" in u:
                    bad.append(("legacy_field", u["user_id"]))
            client.close()
            return bad
        bad = asyncio.run(_check())
        assert not bad, f"migration leftovers: {bad[:5]}"
