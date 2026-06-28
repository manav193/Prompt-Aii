# PromptAI Auth Testing Playbook

PromptAI supports BOTH email/password JWT auth and Emergent-managed Google OAuth.
Both flows share the `users` collection (user_id UUID, NOT MongoDB _id).

## Admin
- email: admin@promptai.app
- password: Admin@PromptAI2025

## Step 1: Mongo verification
```
mongosh
use test_database
db.users.find({role:"admin"}).pretty()
db.users.getIndexes()
```
Expect a bcrypt hash starting with `$2b$` for the admin.

## Step 2: Email/password API tests
```
API=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d= -f2)

# Register
curl -c cookies.txt -X POST "$API/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test1@example.com","password":"Pass@1234"}'

# Login
curl -c cookies.txt -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@promptai.app","password":"Admin@PromptAI2025"}'

# Me
curl -b cookies.txt "$API/api/auth/me"

# Logout
curl -b cookies.txt -X POST "$API/api/auth/logout"
```

## Step 3: Google session test (cannot exchange real session_id without browser)
- Send a bogus session_id and expect 401.
```
curl -X POST "$API/api/auth/google/session" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"NOT_REAL"}'
```

## Step 4: Browser Google OAuth flow
1. From landing page click "Continue with Google".
2. Frontend redirects to `https://auth.emergentagent.com/?redirect={origin}/dashboard`.
3. Emergent returns to `{origin}/dashboard#session_id=...`.
4. App detects the fragment, calls `POST /api/auth/google/session` with `credentials: 'include'`.
5. Backend exchanges with Emergent, upserts user, sets cookies, returns user.
6. App removes the hash and renders the dashboard.

## Contact + Newsletter
```
curl -X POST "$API/api/contact" -H "Content-Type: application/json" \
  -d '{"name":"X","email":"x@x.com","message":"hello there friend"}'

curl -X POST "$API/api/newsletter" -H "Content-Type: application/json" \
  -d '{"email":"a@a.com"}'
```

## Success criteria
- /api/auth/me returns the user JSON when cookies are present.
- /api/contact and /api/newsletter return `{ok: true}` and persist to MongoDB.
- Dashboard is gated; visiting `/dashboard` without cookies should redirect to /signin.
