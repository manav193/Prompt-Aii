"""End-to-end backend tests for PromptAI iteration 5 (Promptlets v2 / Collections /
Convert / Community / Admin).

Uses BASE_URL from REACT_APP_BACKEND_URL and a few direct motor pokes for credit
balance manipulation. Designed to be safe to re-run.
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


def _mongo_set(email: str, fields: dict):
    async def _run():
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        res = await db.users.update_one({"email": email.lower()}, {"$set": fields})
        client.close()
        return res.modified_count
    return asyncio.run(_run())


def _register(session: requests.Session, email: str | None = None) -> str:
    email = email or _new_email()
    r = session.post(f"{API}/auth/register", json={"name": "U", "email": email, "password": "Passw0rd!Test"})
    assert r.status_code == 200, r.text
    return email


@pytest.fixture
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip("Admin login failed; cannot test admin endpoints")
    return s


# --------------- Health ---------------
def test_health():
    r = requests.get(f"{API}/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# --------------- Promptlets advanced filters & sort ---------------
class TestPromptletFilters:
    def test_filter_category_coding(self):
        r = requests.get(f"{API}/promptlets", params={"category": "Coding"})
        assert r.status_code == 200
        items = r.json()["items"]
        assert items, "expected at least 1 Coding promptlet"
        assert all(i["category"] == "Coding" for i in items)

    def test_filter_plan_pro(self):
        r = requests.get(f"{API}/promptlets", params={"plan": "pro"})
        items = r.json()["items"]
        assert items
        assert all(i["plan"] == "pro" for i in items)

    def test_filter_model_claude(self):
        r = requests.get(f"{API}/promptlets", params={"model": "Claude"})
        items = r.json()["items"]
        assert items
        assert all("Claude" in (i.get("models") or []) for i in items)

    def test_filter_difficulty_advanced(self):
        r = requests.get(f"{API}/promptlets", params={"difficulty": "Advanced"})
        items = r.json()["items"]
        assert items
        assert all(i["difficulty"] == "Advanced" for i in items)

    def test_filter_max_credits_one(self):
        r = requests.get(f"{API}/promptlets", params={"max_credits": 1})
        items = r.json()["items"]
        assert items
        assert all(int(i.get("credits_cost", 1)) <= 1 for i in items)

    def test_filter_q_portrait_matches(self):
        r = requests.get(f"{API}/promptlets", params={"q": "portrait"})
        items = r.json()["items"]
        assert items, "no items matched q=portrait"

    def test_sorts_differ(self):
        def first3(sort):
            r = requests.get(f"{API}/promptlets", params={"sort": sort})
            return [i["slug"] for i in r.json()["items"][:3]]
        trending = first3("trending")
        popular = first3("popular")
        newest = first3("newest")
        quality = first3("quality")
        # At least one of the orderings should differ from another (different keys).
        all_sorted = [trending, popular, newest, quality]
        unique = {tuple(x) for x in all_sorted}
        assert len(unique) >= 2, f"all sort modes returned identical order: {all_sorted}"


# --------------- Promptlet details / rate / reviews ---------------
class TestPromptletDetails:
    SLUG = "cinematic-founder-portrait"  # free, Photo, credits_cost=2

    def _session(self):
        s = requests.Session()
        _register(s)
        return s

    def test_details_shape(self):
        s = self._session()
        r = s.get(f"{API}/promptlets/{self.SLUG}/details")
        assert r.status_code == 200, r.text
        body = r.json()
        assert set(body.keys()) >= {"promptlet", "my_rating", "reviews", "related", "versions"}
        assert body["promptlet"]["slug"] == self.SLUG
        assert len(body["related"]) <= 5
        # related excludes self & same category
        for rel in body["related"]:
            assert rel["slug"] != self.SLUG
            assert rel["category"] == body["promptlet"]["category"]
        assert len(body["versions"]) >= 1

    def test_rate_upsert_and_reviews(self):
        s = self._session()
        # initial details to capture baseline
        d0 = s.get(f"{API}/promptlets/{self.SLUG}/details").json()
        base_avg = d0["promptlet"].get("rating_avg", 0)
        base_count = d0["promptlet"].get("rating_count", 0)
        # POST stars=5 + review
        r1 = s.post(f"{API}/promptlets/{self.SLUG}/rate", json={"stars": 5, "review": "great"})
        assert r1.status_code == 200, r1.text
        d1 = s.get(f"{API}/promptlets/{self.SLUG}/details").json()
        assert d1["promptlet"]["rating_count"] == base_count + 1
        # POST again stars=3 -> update same doc (no double-count)
        r2 = s.post(f"{API}/promptlets/{self.SLUG}/rate", json={"stars": 3, "review": "ok"})
        assert r2.status_code == 200
        d2 = s.get(f"{API}/promptlets/{self.SLUG}/details").json()
        assert d2["promptlet"]["rating_count"] == base_count + 1, "rating_count should not double-count"
        # reviews endpoint lists with user_name
        rv = s.get(f"{API}/promptlets/{self.SLUG}/reviews").json()
        assert "items" in rv
        # Our review should be present and carry user_name
        mine = [x for x in rv["items"] if x.get("review") in ("great", "ok")]
        assert mine, "expected our review in /reviews"
        assert mine[0].get("user_name")


# --------------- Promptlet USE: credits_cost varies & increments downloads ---------------
class TestPromptletUseCredits:
    def test_photo_costs_two_credits_for_free(self):
        s = requests.Session()
        email = _register(s)
        before = s.get(f"{API}/me/usage").json()["balance"]
        r = s.post(f"{API}/promptlets/cinematic-founder-portrait/use")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["cost"] == 2
        assert body["credits"]["balance"] == before - 2

    def test_402_when_low_balance(self):
        s = requests.Session()
        email = _register(s)
        _mongo_set(email, {"credits_balance": 1})
        # Photo costs 2, so 1 isn't enough
        r = s.post(f"{API}/promptlets/cinematic-founder-portrait/use")
        assert r.status_code == 402, r.text

    def test_increments_downloads_and_views(self):
        s = requests.Session()
        _register(s)
        slug = "cinematic-founder-portrait"
        before = requests.get(f"{API}/promptlets").json()["items"]
        before_doc = next(x for x in before if x["slug"] == slug)
        d0, v0 = int(before_doc.get("downloads", 0)), int(before_doc.get("views", 0))
        r = s.post(f"{API}/promptlets/{slug}/use")
        assert r.status_code == 200
        after = requests.get(f"{API}/promptlets").json()["items"]
        after_doc = next(x for x in after if x["slug"] == slug)
        assert int(after_doc["downloads"]) >= d0 + 1
        assert int(after_doc["views"]) >= v0 + 1


# --------------- Community follows + trending ---------------
class TestCommunity:
    def test_follow_unfollow_list(self):
        s = requests.Session()
        _register(s)
        r1 = s.post(f"{API}/community/follow", json={"creator": "PromptAI Team"})
        assert r1.status_code == 200
        # idempotent
        r2 = s.post(f"{API}/community/follow", json={"creator": "PromptAI Team"})
        assert r2.status_code == 200
        lst = s.get(f"{API}/community/follows").json()["items"]
        assert any(f["creator"] == "PromptAI Team" for f in lst)
        assert len([f for f in lst if f["creator"] == "PromptAI Team"]) == 1
        d = s.delete(f"{API}/community/follow/PromptAI%20Team")
        assert d.status_code == 200
        lst2 = s.get(f"{API}/community/follows").json()["items"]
        assert not any(f["creator"] == "PromptAI Team" for f in lst2)

    def test_trending_returns_12(self):
        r = requests.get(f"{API}/community/trending")
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) == 12
        # Sorted descending by score
        scores = [i.get("score") for i in items if "score" in i]
        if scores:
            assert scores == sorted(scores, reverse=True)


# --------------- Collections ---------------
class TestCollections:
    def test_list_12_with_counts(self):
        r = requests.get(f"{API}/collections")
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) == 12
        for c in items:
            assert c.get("count", 0) > 0, f"collection {c.get('slug')} has count=0"

    def test_get_midjourney_collection(self):
        r = requests.get(f"{API}/collections/best-midjourney-prompts")
        assert r.status_code == 200
        body = r.json()
        assert "items" in body
        assert body["items"], "expected midjourney items"
        for p in body["items"]:
            assert "Midjourney" in (p.get("models") or [])


# --------------- Convert (LLM) ---------------
class TestConvert:
    def test_convert_402_before_llm_when_low(self):
        s = requests.Session()
        email = _register(s)
        _mongo_set(email, {"credits_balance": 2})  # below 3
        r = s.post(f"{API}/convert", json={
            "source_model": "ChatGPT", "target_model": "Midjourney",
            "prompt": "A cozy living room at sunset",
        }, timeout=30)
        assert r.status_code == 402, r.text

    def test_convert_returns_prompt_and_decrements_3(self):
        s = requests.Session()
        email = _register(s)
        before = s.get(f"{API}/me/usage").json()["balance"]
        r = s.post(f"{API}/convert", json={
            "source_model": "ChatGPT", "target_model": "Midjourney",
            "prompt": "A cozy living room at sunset, golden hour, soft warm light",
        }, timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        assert isinstance(body["prompt"], str) and len(body["prompt"]) > 0
        assert body["cost"] == 3
        assert body["credits"]["balance"] == before - 3


# --------------- Admin gating + analytics + CRUD ---------------
class TestAdminGating:
    def test_plain_user_403_on_admin(self):
        s = requests.Session()
        _register(s)
        for path in ("/admin/analytics", "/admin/promptlets", "/admin/users",
                     "/admin/categories", "/admin/collections"):
            r = s.get(f"{API}{path}")
            assert r.status_code == 403, f"{path} expected 403, got {r.status_code}"

    def test_admin_analytics_shape(self, admin_session):
        r = admin_session.get(f"{API}/admin/analytics")
        assert r.status_code == 200, r.text
        body = r.json()
        assert set(body.keys()) >= {"totals", "top_promptlets", "top_categories", "recent_users"}
        totals = body["totals"]
        for k in ("users", "pro_users", "verified_users", "promptlets",
                  "featured_promptlets", "prompts", "monthly_prompts",
                  "credits_used", "waitlist", "contact_messages"):
            assert k in totals, f"missing totals.{k}"


class TestAdminPromptletCrud:
    SLUG = f"test-plet-{uuid.uuid4().hex[:6]}"

    def test_create_update_feature_delete(self, admin_session):
        payload = {
            "name": f"TEST Promptlet {self.SLUG}",
            "slug": self.SLUG,
            "category": "Coding",
            "plan": "free",
            "description": "A test promptlet created by automated tests.",
            "prompt": "Write a Python function that adds two numbers.",
            "models": ["Claude", "ChatGPT"],
            "difficulty": "Beginner",
            "credits_cost": 1,
            "quality": 4,
        }
        r = admin_session.post(f"{API}/admin/promptlets", json=payload)
        assert r.status_code == 200, r.text
        # slug collision
        r2 = admin_session.post(f"{API}/admin/promptlets", json=payload)
        assert r2.status_code == 400

        # verify visible
        items = admin_session.get(f"{API}/admin/promptlets").json()["items"]
        assert any(i["slug"] == self.SLUG for i in items)

        # update
        upd = {**payload, "description": "Updated description for the test promptlet."}
        upd.pop("slug")
        ru = admin_session.patch(f"{API}/admin/promptlets/{self.SLUG}", json={**upd, "slug": self.SLUG})
        assert ru.status_code == 200, ru.text

        # feature toggle
        rf = admin_session.post(f"{API}/admin/promptlets/{self.SLUG}/feature")
        assert rf.status_code == 200
        assert "featured" in rf.json()

        # delete
        rd = admin_session.delete(f"{API}/admin/promptlets/{self.SLUG}")
        assert rd.status_code == 200
        # 404 on second delete
        rd2 = admin_session.delete(f"{API}/admin/promptlets/{self.SLUG}")
        assert rd2.status_code == 404


class TestAdminUserPatch:
    def test_admin_can_change_subscription(self, admin_session):
        s = requests.Session()
        email = _register(s)
        me = s.get(f"{API}/auth/me").json()
        user_id = me["user_id"]
        # bump to pro via admin
        r = admin_session.patch(f"{API}/admin/users/{user_id}", json={"subscription": "pro"})
        assert r.status_code == 200, r.text
        me2 = s.get(f"{API}/auth/me").json()
        assert me2["subscription"] == "pro"


class TestAdminCategoriesAndCollections:
    def test_categories_upsert_delete(self, admin_session):
        name = f"TEST_Cat_{uuid.uuid4().hex[:6]}"
        r = admin_session.post(f"{API}/admin/categories", json={"name": name, "active": True})
        assert r.status_code == 200
        rows = admin_session.get(f"{API}/admin/categories").json()["items"]
        assert any(x["name"] == name for x in rows)
        d = admin_session.delete(f"{API}/admin/categories/{name}")
        assert d.status_code == 200

    def test_collections_upsert_delete(self, admin_session):
        slug = f"test-coll-{uuid.uuid4().hex[:6]}"
        r = admin_session.post(f"{API}/admin/collections", json={
            "slug": slug, "name": "TEST Collection", "subtitle": "auto",
            "model": "Claude",
        })
        assert r.status_code == 200, r.text
        rows = admin_session.get(f"{API}/admin/collections").json()["items"]
        assert any(x["slug"] == slug for x in rows)
        d = admin_session.delete(f"{API}/admin/collections/{slug}")
        assert d.status_code == 200


# --------------- Auth regression: unauthenticated access ---------------
class TestAuthGuards:
    def test_details_requires_auth(self):
        r = requests.get(f"{API}/promptlets/cinematic-founder-portrait/details")
        assert r.status_code == 401

    def test_convert_requires_auth(self):
        r = requests.post(f"{API}/convert", json={
            "source_model": "ChatGPT", "target_model": "Midjourney", "prompt": "hello"
        })
        assert r.status_code == 401

    def test_admin_requires_auth(self):
        r = requests.get(f"{API}/admin/analytics")
        assert r.status_code == 401
