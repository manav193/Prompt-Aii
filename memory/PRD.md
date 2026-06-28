# PromptAI – Product Requirements (Live Doc)

## Original Problem Statement
Create a premium AI SaaS landing page for a startup called **PromptAI** — an all-in-one AI platform that helps users generate optimized prompts for ChatGPT, Claude, Gemini, Midjourney, Stable Diffusion, Flux, Adobe Firefly, Cursor, Lovable, Emergent and other AI tools. Style: futuristic, premium, dark mode, glassmorphism, smooth animations, gradient lighting, Apple + Linear + Vercel level UI quality. Must include: hero, trusted-by, features, how-it-works, models, pricing, testimonials, FAQ, footer, contact.

## User Choices (verbatim from clarifying questions)
- Contact: store submissions in MongoDB (no email provider configured).
- CTAs: redirect users to Sign Up; after successful auth users land on a PromptAI dashboard. Architecture must be scalable for Stripe subscriptions later.
- Newsletter: capture emails to MongoDB.
- Palette (LOCKED):
  - Primary bg `#050816`, surface `#0F172A`
  - Cyan `#00E5FF`, Royal Blue `#3B82F6`, Emerald `#10B981` (success only)
  - Avoid generic purple AI gradients.
- Auth: BOTH Google Sign-In AND Email/Password. Sign up / sign in via either method, reset forgotten password, secure sessions, profiles in MongoDB, production-ready.

## Architecture
- **Backend** (FastAPI + Motor):
  - JWT email/password auth (bcrypt, access+refresh httpOnly cookies, SameSite=None+Secure for cross-site Emergent preview).
  - Emergent-managed Google OAuth: frontend → `auth.emergentagent.com` → callback with `#session_id`; backend exchanges `session_id` via Emergent `session-data` endpoint, upserts user, issues our own JWT cookies. One unified `users` collection keyed on `user_id` (UUID), NOT MongoDB `_id`.
  - Endpoints: `/api/auth/{register,login,logout,me,refresh,forgot-password,reset-password,google/session}`, `/api/contact`, `/api/newsletter`, `/api/health`.
  - Indexes on `users.email`, `users.user_id`, `newsletter.email`, `login_attempts.identifier`, `password_reset_tokens.token`.
  - Brute-force: 5 failed attempts → 15 min lockout.
  - Admin seeded on startup (`admin@promptai.app` / `Admin@PromptAI2025`).
- **Frontend** (React + Tailwind + shadcn/ui + framer-motion):
  - Routes: `/`, `/signin`, `/signup`, `/dashboard` (protected). Synchronous OAuth `#session_id` interception in `App.js` to avoid race.
  - Sections: Hero (animated, AI background, dual CTA), TrustedBy marquee, Features grid, How it works, Models grid, Pricing (3 tiers, Pro highlighted), Testimonials, FAQ (shadcn Accordion), Contact form, Footer with newsletter.
  - Typography: Space Grotesk (display) + Manrope (body) + JetBrains Mono (code accent).
  - Animations: framer-motion fade-up, CSS marquee, animated gradient orbs, glass + glow accents.

## What's been implemented (Dec 2025)
- Full premium dark landing page with all requested sections.
- Hybrid auth (JWT email/pw + Emergent Google), httpOnly cookies, /auth/me session check.
- Newsletter, contact form persisted to MongoDB.
- Protected `/dashboard` page with placeholder stats and upgrade CTA (Stripe-ready).
- Admin seeding + brute-force protection + password reset (link logged to backend console).

## Prioritized Backlog
- **P0**
  - End-to-end tested auth flows (testing_agent_v3).
  - Confirm Emergent Google callback works on preview URL.
- **P1**
  - Stripe subscription checkout for Pro/Enterprise CTAs.
  - Real email delivery (Resend) for contact + password reset.
  - In-app prompt generator (the actual product) — current dashboard is a placeholder.
- **P2**
  - Team workspaces, role-based permissions.
  - Versioning / A/B testing UI.
  - Analytics page.

## Test credentials
- See `/app/memory/test_credentials.md`.
