"""End-to-end backend test for the PromptAI MVP (iteration 3).

Covers: promptlets catalog, gating, usage counter, favorites, history,
subscription upgrade, email verification, password reset.
"""
import os
import re
import subprocess
import time
import uuid

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://prompt-craft-demo.preview.emergentagent.com"
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@promptai.app"
ADMIN_PASSWORD = "Admin@PromptAI2025"


def _new_email():
    # backend lowercases on insert; use lowercase here so log scraping by email matches
    return f"test_{uuid.uuid4().hex[:10]}@example.com"


def _tail_backend_log(pattern: str, attempts: int = 8, sleep: float = 0.5):
    """Scan supervisor backend stderr/stdout logs for a line matching pattern, return the match."""
    log_paths = [
        "/var/log/supervisor/backend.err.log",
        "/var/log/supervisor/backend.out.log",
    ]
    rx = re.compile(pattern)
    for _ in range(attempts):
        for p in log_paths:
            try:
                with open(p, "r", errors="ignore") as f:
                    # only look at last ~200 lines
                    lines = f.readlines()[-400:]
            except FileNotFoundError:
                continue
            for line in reversed(lines):
                m = rx.search(line)
                if m:
                    return m
        time.sleep(sleep)
    return None


# ---------- Promptlets catalog (anonymous) ----------
class TestPromptletsCatalog:
    def test_anonymous_list_returns_27_locked_pro(self):
        r = requests.get(f"{API}/promptlets")
        assert r.status_code == 200
        data = r.json()
        items = data["items"]
        assert len(items) == 27, f"expected 27 promptlets, got {len(items)}"
        # 10 categories
        cats = set(data["categories"])
        assert len(cats) == 10, f"expected 10 categories, got {cats}"

        photo = [i for i in items if i["category"] == "Photo"]
        assert len(photo) == 3
        assert all(i["plan"] == "free" for i in photo)
        # anonymous: free items should have prompt populated and locked=False
        for i in photo:
            assert i["locked"] is False
            assert i["prompt"] and i["prompt"] is not None
        # pro items: locked=True and prompt=None for anonymous
        pro = [i for i in items if i["plan"] == "pro"]
        assert len(pro) == 24
        for i in pro:
            assert i["locked"] is True
            assert i["prompt"] is None

    def test_filter_category_coding(self):
        r = requests.get(f"{API}/promptlets", params={"category": "Coding"})
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) > 0
        assert all(i["category"] == "Coding" for i in items)

    def test_filter_plan_free_and_pro(self):
        r_free = requests.get(f"{API}/promptlets", params={"plan": "free"}).json()
        r_pro = requests.get(f"{API}/promptlets", params={"plan": "pro"}).json()
        assert all(i["plan"] == "free" for i in r_free["items"])
        assert all(i["plan"] == "pro" for i in r_pro["items"])
        assert len(r_free["items"]) == 3
        assert len(r_pro["items"]) == 24

    def test_search_portrait(self):
        r = requests.get(f"{API}/promptlets", params={"q": "portrait"})
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 1
        joined = " ".join((i["name"] + " " + i["description"]).lower() for i in items)
        assert "portrait" in joined


# ---------- Authenticated free user: gating + usage ----------
class TestFreeUserGating:
    @pytest.fixture(scope="class")
    def free_session(self):
        s = requests.Session()
        email = _new_email()
        password = "Passw0rd!Test"
        r = s.post(f"{API}/auth/register", json={"name": "Free User", "email": email, "password": password})
        assert r.status_code == 200, r.text
        # ensure free plan + reset usage
        return {"session": s, "email": email, "password": password}

    def test_list_marks_locked_correctly(self, free_session):
        s = free_session["session"]
        r = s.get(f"{API}/promptlets")
        assert r.status_code == 200
        items = r.json()["items"]
        for i in items:
            if i["plan"] == "free":
                assert i["locked"] is False
                assert i["prompt"] is not None
            else:
                assert i["locked"] is True
                assert i["prompt"] is None

    def test_use_pro_returns_403(self, free_session):
        s = free_session["session"]
        items = s.get(f"{API}/promptlets").json()["items"]
        pro = next(i for i in items if i["plan"] == "pro")
        r = s.post(f"{API}/promptlets/{pro['promptlet_id']}/use")
        assert r.status_code == 403

    def test_use_free_increments_usage(self, free_session):
        s = free_session["session"]
        items = s.get(f"{API}/promptlets").json()["items"]
        free_item = next(i for i in items if i["plan"] == "free")
        used_before = s.get(f"{API}/me/usage").json()["used"]
        r = s.post(f"{API}/promptlets/{free_item['promptlet_id']}/use")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert body["prompt"]
        used_after = s.get(f"{API}/me/usage").json()["used"]
        assert used_after == used_before + 1

    def test_usage_cap_at_100_returns_402(self, free_session):
        """Force usage to 99, do one OK call, then a 402."""
        s = free_session["session"]
        # Direct DB tweak via subscription endpoint isn't available; we use the
        # admin path via mongo shell only if needed. Instead, drive via API by
        # bumping usage with repeated calls would be slow. We hit usage manually
        # via mongo through a backend admin route — but no such route exists.
        # So: just do remaining calls until we observe 402.
        usage = s.get(f"{API}/me/usage").json()
        remaining = usage["limit"] - usage["used"]
        items = s.get(f"{API}/promptlets").json()["items"]
        free_id = next(i["promptlet_id"] for i in items if i["plan"] == "free")
        # Cap remaining loop to avoid runaway in case of bug; FREE_LIMIT == 100
        last_status = None
        for _ in range(remaining + 1):
            last = s.post(f"{API}/promptlets/{free_id}/use")
            last_status = last.status_code
            if last_status == 402:
                break
        assert last_status == 402, f"expected 402 after exhausting quota, got {last_status}"


# ---------- Upgrade flow ----------
class TestSubscriptionUpgrade:
    def test_upgrade_unlocks_pro(self):
        s = requests.Session()
        email = _new_email()
        r = s.post(f"{API}/auth/register", json={"name": "Upgrade U", "email": email, "password": "Passw0rd!Test"})
        assert r.status_code == 200
        # Before
        items_before = s.get(f"{API}/promptlets").json()["items"]
        pro_before = [i for i in items_before if i["plan"] == "pro"]
        assert all(i["locked"] for i in pro_before)
        # Upgrade
        up = s.post(f"{API}/me/subscription", json={"plan": "pro"})
        assert up.status_code == 200
        assert up.json()["subscription"] == "pro"
        # After
        items_after = s.get(f"{API}/promptlets").json()["items"]
        pro_after = [i for i in items_after if i["plan"] == "pro"]
        assert all(not i["locked"] for i in pro_after)
        # Pro can use a pro promptlet
        pro_id = pro_after[0]["promptlet_id"]
        u = s.post(f"{API}/promptlets/{pro_id}/use")
        assert u.status_code == 200
        assert u.json()["prompt"]


# ---------- Favorites + history + usage endpoints ----------
class TestFavoritesAndHistory:
    @pytest.fixture(scope="class")
    def admin_session(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        if r.status_code != 200:
            pytest.skip(f"admin login failed: {r.status_code} {r.text}")
        # ensure pro
        s.post(f"{API}/me/subscription", json={"plan": "pro"})
        return s

    def test_favorite_toggle(self, admin_session):
        s = admin_session
        items = s.get(f"{API}/promptlets").json()["items"]
        pid = items[0]["promptlet_id"]
        r = s.post(f"{API}/promptlets/{pid}/favorite", json={"favorite": True})
        assert r.status_code == 200
        favs = s.get(f"{API}/me/favorites").json()["items"]
        assert any(f["promptlet_id"] == pid for f in favs)
        # remove
        r = s.post(f"{API}/promptlets/{pid}/favorite", json={"favorite": False})
        assert r.status_code == 200
        favs2 = s.get(f"{API}/me/favorites").json()["items"]
        assert not any(f["promptlet_id"] == pid for f in favs2)

    def test_history_newest_first(self, admin_session):
        s = admin_session
        items = s.get(f"{API}/promptlets").json()["items"]
        ids = [items[0]["promptlet_id"], items[1]["promptlet_id"]]
        for pid in ids:
            r = s.post(f"{API}/promptlets/{pid}/use")
            assert r.status_code == 200
            time.sleep(0.05)
        hist = s.get(f"{API}/me/history").json()["items"]
        assert len(hist) >= 2
        # ensure sorted desc
        cas = [h["created_at"] for h in hist]
        assert cas == sorted(cas, reverse=True)
        # the most recent should be the last used id
        assert hist[0]["promptlet_id"] == ids[-1]

    def test_usage_shape(self, admin_session):
        s = admin_session
        u = s.get(f"{API}/me/usage").json()
        for key in ("plan", "used", "limit", "period_start", "period_end"):
            assert key in u, f"missing {key}"


# ---------- Email verification ----------
class TestEmailVerification:
    def test_register_logs_token_and_verify(self):
        s = requests.Session()
        email = _new_email()
        r = s.post(f"{API}/auth/register", json={"name": "Verify U", "email": email, "password": "Passw0rd!Test"})
        assert r.status_code == 200
        assert r.json()["email_verified"] is False
        # tail backend log for token
        pattern = rf"Verify email for {re.escape(email)} -> .*token=([\w\-]+)"
        m = _tail_backend_log(pattern, attempts=12, sleep=0.5)
        assert m, f"verify-email token not found in backend logs for {email}"
        token = m.group(1)
        v = requests.post(f"{API}/auth/verify-email", json={"token": token})
        assert v.status_code == 200
        # now /auth/me reports verified
        me = s.get(f"{API}/auth/me").json()
        assert me["email_verified"] is True

    def test_resend_verification_invalidates_old(self):
        s = requests.Session()
        email = _new_email()
        r = s.post(f"{API}/auth/register", json={"name": "Resend U", "email": email, "password": "Passw0rd!Test"})
        assert r.status_code == 200
        m1 = _tail_backend_log(rf"Verify email for {re.escape(email)} -> .*token=([\w\-]+)")
        assert m1
        old_token = m1.group(1)
        # resend
        rr = s.post(f"{API}/auth/resend-verification")
        assert rr.status_code == 200
        m2 = _tail_backend_log(rf"Resent verify-email link for {re.escape(email)} -> .*token=([\w\-]+)")
        assert m2
        new_token = m2.group(1)
        assert new_token != old_token
        # old token should now fail
        bad = requests.post(f"{API}/auth/verify-email", json={"token": old_token})
        assert bad.status_code == 400
        good = requests.post(f"{API}/auth/verify-email", json={"token": new_token})
        assert good.status_code == 200


# ---------- Password reset ----------
class TestPasswordReset:
    def test_forgot_then_reset(self):
        # Create user first
        s = requests.Session()
        email = _new_email()
        s.post(f"{API}/auth/register", json={"name": "Forgot U", "email": email, "password": "OldPassw0rd!"})
        # forgot
        r = requests.post(f"{API}/auth/forgot-password", json={"email": email})
        assert r.status_code == 200
        m = _tail_backend_log(rf"Password reset link for {re.escape(email)} -> .*token=([\w\-]+)")
        assert m, "reset token not logged"
        token = m.group(1)
        new_password = "BrandNewPass1!"
        r2 = requests.post(f"{API}/auth/reset-password", json={"token": token, "password": new_password})
        assert r2.status_code == 200
        # login with new password
        s2 = requests.Session()
        lg = s2.post(f"{API}/auth/login", json={"email": email, "password": new_password})
        assert lg.status_code == 200
        # old password fails
        bad = requests.Session().post(f"{API}/auth/login", json={"email": email, "password": "OldPassw0rd!"})
        assert bad.status_code == 401
