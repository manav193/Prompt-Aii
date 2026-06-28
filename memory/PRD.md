# PromptAI – Product Requirements (Live Doc)

## Original Problem Statement (rolled up)
A premium dark-mode SaaS for prompt engineering across every major AI model. Started as a landing page; evolved through (1) auth + dashboard, (2) credits + generator, (3) testimonials → waitlist, (4) settings/billing/profile + sidebar, and (5) full Prompt-Platform: App-Store-grade Promptlet cards, Prompt Detail pages, Collections, Advanced Search, Prompt Converter, Community (ratings/reviews/follows/trending) and Admin (CRUD + analytics).

## Locked design tokens (never changed)
- Palette: bg `#050816`, surface `#0F172A`, cyan `#00E5FF`, blue `#3B82F6`, emerald `#10B981`.
- Fonts: Space Grotesk (display), Manrope (body), JetBrains Mono (mono).
- Glassmorphism + soft cyan glows; no purple-on-white AI slop; Apple/Linear/Vercel feel.

## Architecture
### Backend (FastAPI + Motor + bcrypt + PyJWT + httpx + emergentintegrations)
- **Auth**: JWT in httpOnly cookies (access+refresh, SameSite=None+Secure), brute-force lockout (5/15min), server-side revocation via `tokens_valid_from`, email/password + Emergent Google OAuth share one `users` collection (uuid `user_id`).
- **Email verify + password reset**: tokens logged to backend stdout (no email provider configured — MOCKED EMAIL).
- **Credits**: `credits_balance`, `credits_used`, `next_credit_date`. Free = 100/cycle; refill 30 days *after* balance hits 0 (per-user countdown). Pro = unlimited.
- **Promptlets**: 27 seeded across 10 categories with enriched fields (`preview_image_url`, `difficulty`, `credits_cost`, `quality`, `views`, `downloads`, `rating_sum`, `rating_count`, `featured`, `version`, `creator`).
- **Generator**: `/api/generate/optimize` calls Claude Sonnet 4.6 via Emergent LLM key, pre-flight balance check, charges 3 credits after success.
- **Converter**: `/api/convert` rewrites a prompt between 10 supported models. 3 credits, post-success charge.
- **Community**: `/api/promptlets/{slug}/rate`, `/reviews`, `/community/follow`, `/community/trending`.
- **Collections**: 12 curated collections served via `/api/collections{/:slug}` (model/category/slug-list matching).
- **Admin** (role-gated): analytics, promptlets CRUD + feature toggle, users PATCH, categories CRUD, collections CRUD.
- **Indexes**: users.email + user_id (unique), favorites compound, prompt_history user_id+created_at, saved_prompts saved_id unique, promptlets slug+category, collections slug, categories name, ratings user_id+promptlet_id, follows user_id+creator.

### Frontend (React + Tailwind + shadcn/ui + framer-motion + sonner)
- **Routes**: `/` (landing), `/signin|/signup|/forgot-password|/reset-password|/verify-email`, then protected: `/dashboard, /generate, /marketplace, /promptlets/:slug, /collections, /collections/:slug, /convert, /history, /saved, /billing, /settings, /admin`. Legacy `/favorites→/saved`, `/account→/settings`.
- **Sidebar**: Dashboard / Generate / Promptlets / Collections / Convert / History / Saved / Billing / Settings (+ Admin when role=admin).
- **Marketplace cards**: Large preview image, Free/Pro badge, category chip, credits pill, difficulty color chip, quality stars, model chips, popularity bar with views + downloads, 4 actions (Copy / Save / Share / Open). Whole card is click-through to detail.
- **Detail page**: Hero with preview + stats + actions (Copy/Save/Share/Convert), Prompt panel (Pro-locked when applicable), How to use, Expected output, Compatible models, Ratings & Reviews (star input + textarea), Version history, Creator with Follow toggle, Related promptlets.
- **Collections**: 12 cards with cover images; detail page renders matching promptlets.
- **Convert**: source/target model pickers, swap button, prompt editor, output panel with Copy + Export, cost display.
- **Admin**: 5 tabs (Analytics with KPIs + top promptlets/categories + recent users; Promptlets CRUD + Feature; Users plan+role inline edit; Categories add/delete; Collections list).

## What's been implemented (Dec 2025)
- Iterations 1–5 all green via testing_agent. Latest run: backend 28/28 pass, frontend 100% scenarios.
- No fictional people or companies anywhere; demo content is realistic and from the actual platform.

## Backlog
- **P0**: Stripe checkout to replace the `/api/me/subscription` toggle.
- **P0**: Real email delivery (Resend) for verify + reset + admin notifications.
- **P1**: Split `server.py` into routers (auth/credits/promptlets/generate/convert/community/admin).
- **P1**: Atomic credit consumption via `findOneAndUpdate` with conditional balance (eliminate read-modify-write race).
- **P1**: View-count dedupe (TTL key per user+promptlet).
- **P2**: User-uploaded promptlets + creator profiles + follows beyond "PromptAI Team".
- **P2**: A/B testing UI + real version history (currently a single seeded version).

## Test credentials
See `/app/memory/test_credentials.md`.
