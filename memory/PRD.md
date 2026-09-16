# PromptAI – Product Requirements (Live Doc)

## Product
A premium dark-mode SaaS for prompt engineering across major AI models. The platform provides authentication, credits, prompt generation, conversion, reverse prompting, marketplace promptlets, collections, community features and an admin surface.

## Design tokens
- Palette: bg `#050816`, surface `#0F172A`, cyan `#00E5FF`, blue `#3B82F6`, emerald `#10B981`.
- Fonts: Space Grotesk (display), Manrope (body), JetBrains Mono (mono).
- Glassmorphism + soft cyan glows; no purple-on-white AI slop; Apple/Linear/Vercel feel.

## Architecture
### Backend (FastAPI + Motor + bcrypt + PyJWT + httpx)
- **Auth**: JWT in httpOnly cookies (access+refresh, SameSite=None+Secure), brute-force lockout (5/15min), server-side revocation via `tokens_valid_from`, email/password auth in one `users` collection (`user_id` is an application UUID).
- **Email verify + password reset**: token workflow is currently logged to backend stdout; a transactional email provider can be added independently.
- **Credits**: `credits_balance`, `credits_used`, `next_credit_date`. Free = 100/cycle; refill 30 days after balance hits 0. Pro = unlimited.
- **AI boundary**: PromptAI does not own model/provider credentials. AI generation and intelligence calls are delegated to NIMO-CORE through the server-side `NIMO_CORE_URL` integration.
- **Promptlets**: curated catalogue with enriched fields (`preview_image_url`, `difficulty`, `credits_cost`, `quality`, `views`, `downloads`, `rating_sum`, `rating_count`, `featured`, `version`, `creator`).
- **Generator**: `/api/generate/optimize` sends a structured prompt-engineering request to NIMO-CORE and charges 3 credits after success.
- **Converter**: `/api/convert` sends a structured conversion request to NIMO-CORE and charges 3 credits after success.
- **Community**: ratings/reviews, follows and trending.
- **Collections**: curated collections served via `/api/collections` and `/api/collections/{slug}`.
- **Admin**: role-gated analytics, promptlet CRUD, users, categories and collections.
- **Indexes**: users.email + user_id (unique), favorites compound, prompt_history user_id+created_at, saved_prompts saved_id unique, promptlets slug+category, collections slug, categories name, ratings user_id+promptlet_id, follows user_id+creator.

### Frontend (React + Tailwind + shadcn/ui + framer-motion + sonner)
- **Routes**: `/` (landing), `/signin|/signup|/forgot-password|/reset-password|/verify-email`, then protected: `/dashboard, /generate, /reverse-prompt, /marketplace, /promptlets/:slug, /collections, /collections/:slug, /convert, /history, /saved, /billing, /settings, /admin`.
- **Sidebar**: Dashboard / Generate / Promptlets / Collections / Convert / History / Saved / Billing / Settings (+ Admin when role=admin).
- **Marketplace**: promptlet cards, advanced search/filtering, detail pages, ratings and reviews.
- **Reverse Prompt**: image upload and structured visual prompt analysis through NIMO-CORE.
- **Generator/Converter**: server-side AI calls with PromptAI-owned credit accounting.

## Independence requirements
- No third-party hosted auth redirects.
- No provider-specific frontend branding or generated badges.
- No legacy provider SDK dependency in `backend/requirements.txt`.
- No provider-specific LLM keys in PromptAI application code.
- NIMO-CORE is the internal AI service boundary; provider/model selection belongs behind that boundary.

## Backlog
- **P0**: Stripe checkout to replace the `/api/me/subscription` demo toggle.
- **P0**: Real email delivery for verification/reset/admin notifications.
- **P1**: Split `server.py` into routers (auth/credits/promptlets/generate/convert/community/admin).
- **P1**: Atomic credit consumption via `findOneAndUpdate` with conditional balance.
- **P1**: View-count dedupe.
- **P2**: User-uploaded promptlets + creator profiles + richer follows.
- **P2**: Real version history.

## Test credentials
See `/app/memory/test_credentials.md`.
