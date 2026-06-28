# PromptAI – Product Requirements (Live Doc)

## Original Problem Statement
Premium AI SaaS landing page that evolved into a full MVP. PromptAI generates optimized prompts for ChatGPT, Claude, Gemini, Midjourney, Stable Diffusion, Flux, Adobe Firefly, Cursor, Lovable, Emergent (and more). Style: futuristic, premium, dark mode, glassmorphism, Apple + Linear + Vercel-grade UI.

## User Choices (verbatim)
- Palette LOCKED: bg `#050816`, surface `#0F172A`, cyan `#00E5FF`, blue `#3B82F6`, emerald `#10B981` (success only). Avoid generic purple AI gradients.
- Contact → MongoDB (no email provider).
- Newsletter → MongoDB.
- Auth: BOTH Google (Emergent OAuth) AND email/password (forgot password, email verification, secure sessions, profiles in MongoDB).
- Dashboard with: welcome, usage counter (100/mo free), current plan, recent prompts, saved promptlets.
- Free vs Pro gating exactly as spec'd.
- Promptlets Marketplace with image, name, category, models, Free/Pro badge, copy + favorite.
- Architecture must remain scalable for Stripe later.

## Architecture
- **Backend** (FastAPI + Motor + bcrypt + PyJWT + httpx):
  - Auth: JWT in httpOnly cookies (access+refresh, SameSite=None+Secure), brute-force lockout (5 attempts → 15 min), server-side token revocation via `tokens_valid_from` on logout. Emergent-managed Google OAuth callback writes into the same `users` collection (UUID `user_id`).
  - Verify-email + resend-verification (links logged to backend stdout — no email provider).
  - Password reset (forgot + reset, single-use token, 1h ttl, logged to stdout).
  - Catalogue: 27 promptlets across 10 categories (Photo=3 Free; Website/Coding/App Dev/Marketing/Writing/Video/Image Editing/Business/AI Agents=24 Pro) — idempotently seeded on startup.
  - Promptlet endpoints: list (with `category` / `plan` / `q` filters), get, use (records `prompt_history`, increments `prompts_used`, enforces 402 quota), favorite toggle.
  - Per-user: `/api/me/usage`, `/api/me/favorites`, `/api/me/history`, `/api/me/subscription` (free/pro toggle — Stripe placeholder).
  - Collections + indexes: `users` (unique email + user_id), `login_attempts`, `password_reset_tokens` (unique token), `newsletter` (unique email), `promptlets` (unique slug + category index), `favorites` (compound user_id+promptlet_id unique), `prompt_history` (user_id+created_at), `contact_submissions`.

- **Frontend** (React 19 + Tailwind + shadcn/ui + framer-motion + sonner):
  - Routes: `/`, `/signin`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/dashboard`, `/marketplace`, `/favorites`, `/history`, `/account` (last 5 are ProtectedRoute-gated). Synchronous `#session_id=` detection in App.js for OAuth.
  - Premium landing intact: Hero (animated), Trusted-by marquee, Features, How it works, Models, Pricing, Testimonials, FAQ, Contact, Footer with newsletter.
  - Dashboard shell with persistent sidebar (Overview / Marketplace / Favorites / History / Account + user card + sign-out).
  - Marketplace card grid with category + plan chip filters, search, Free/Pro badges, Copy (calls `/use`, copies to clipboard, surfaces remaining quota), Favorite heart toggle. Locked Pro cards show "Pro only".
  - Auth verification banner appears at top of every Dashboard page until verified; "Resend link" wired.
  - Typography: Space Grotesk (display) + Manrope (body) + JetBrains Mono.

## What's been implemented (Dec 2025)
- Full premium landing page + hybrid auth (Google + email/password) + forgot/reset/verify email.
- Promptlets marketplace (27 / 10 categories), Free vs Pro gating with 100/mo quota for free users (402 when exceeded).
- Dashboard with live usage, current plan, recent prompts, saved promptlets, upgrade CTA.
- Favorites + History pages, Account settings with plan toggle (Stripe-ready placeholder).
- Newsletter + Contact form persisted to MongoDB.
- Iteration testing: backend 13/15 pass + frontend 100% executed scenarios (catalog count fixed to 27).

## Prioritized Backlog
- **P0**: ship Stripe checkout (replace `/api/me/subscription` toggle).
- **P0**: hook a real email provider (Resend) — replace logger.info verify/reset links with delivered emails.
- **P1**: actual prompt-generation UI (multi-model rewriter) inside `/dashboard`.
- **P1**: prompt library variables/inputs UX (today users copy templates with `{{placeholders}}`).
- **P2**: team workspaces, share-by-link, public prompt gallery.
- **P2**: A/B testing + versioning UI per prompt.

## Test credentials
See `/app/memory/test_credentials.md`.
