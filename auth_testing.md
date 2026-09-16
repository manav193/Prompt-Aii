# PromptAI Auth Testing Playbook

PromptAI uses email/password JWT authentication. Access and refresh tokens are stored in httpOnly cookies and share the `users` collection (`user_id` is the application UUID, not MongoDB `_id`).

## Admin
- email: admin@promptai.app
- password: Admin@PromptAI2025

## Step 1: Mongo verification
```bash
mongosh
use test_database
db.users.find({role:"admin"}).pretty()
db.users.getIndexes()
```
Expect a bcrypt hash starting with `$2b$` for the admin.

## Step 2: Email/password API tests
```bash
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

## Step 3: Auth regression checks
- There must be no hosted OAuth redirect from `/signin` or `/signup`.
- `POST /api/auth/google/session` must not exist.
- A request to `/api/auth/me` without cookies must return 401.
- Dashboard routes must remain protected by the frontend auth context.

## Step 4: AI service boundary
- Generator and converter calls stay behind the PromptAI backend.
- PromptAI calls NIMO-CORE using `NIMO_CORE_URL` and optional `NIMO_INTEGRATION_KEY`.
- Provider API keys must remain inside NIMO-CORE and never reach the browser.

## Contact + Newsletter
```bash
curl -X POST "$API/api/contact" -H "Content-Type: application/json" \
  -d '{"name":"X","email":"x@x.com","message":"hello there friend"}'

curl -X POST "$API/api/newsletter" -H "Content-Type: application/json" \
  -d '{"email":"a@a.com"}'
```

## Success criteria
- `/api/auth/me` returns user JSON when valid cookies are present.
- `/api/contact` and `/api/newsletter` return `{ok: true}` and persist to MongoDB.
- `/api/auth/google/session` is absent.
- No hosted third-party auth page is opened by the frontend.
