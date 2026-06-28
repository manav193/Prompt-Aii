"""Seed catalog for PromptAI promptlets. Each item is a re-usable, model-aware prompt template."""

PROMPTLETS = [
    # ---------- PHOTO (FREE) ----------
    {
        "slug": "cinematic-founder-portrait",
        "name": "Cinematic founder portrait",
        "category": "Photo",
        "plan": "free",
        "description": "A magazine-quality portrait prompt for any founder, exec or creator.",
        "prompt": (
            "Cinematic founder portrait of {{subject}}, {{environment}} at dusk, "
            "shallow depth of field, 35mm anamorphic, soft rim light, Fujifilm Pro 400H, "
            "neon spill, editorial composition --ar 4:5 --v 6.1"
        ),
        "models": ["Midjourney", "Flux", "Stable Diffusion"],
        "gradient": ["#0EA5E9", "#3B82F6"],
        "image_keyword": "cinematic portrait",
    },
    {
        "slug": "product-hero-shot",
        "name": "Product hero shot",
        "category": "Photo",
        "plan": "free",
        "description": "Premium e-com hero render for any physical product.",
        "prompt": (
            "Studio product hero of {{product}}, seamless backdrop in {{accent_color}}, "
            "85mm macro, soft top-down key light, controlled specular highlights, "
            "ultra-clean shadows, Apple-keynote aesthetic --ar 1:1 --v 6.1"
        ),
        "models": ["Midjourney", "Adobe Firefly", "Flux"],
        "gradient": ["#22D3EE", "#0EA5E9"],
        "image_keyword": "studio product",
    },
    {
        "slug": "anime-character-portrait",
        "name": "Anime character portrait",
        "category": "Photo",
        "plan": "free",
        "description": "Editorial anime/manga style portrait with stylized lighting.",
        "prompt": (
            "Anime portrait of {{character}}, expressive eyes, soft volumetric lighting, "
            "studio Ghibli x Makoto Shinkai vibe, oil-painted skin, watercolor background, "
            "high detail, ultra crisp linework --ar 3:4"
        ),
        "models": ["Midjourney", "Stable Diffusion"],
        "gradient": ["#06B6D4", "#3B82F6"],
        "image_keyword": "anime portrait",
    },

    # ---------- WEBSITE (PRO) ----------
    {
        "slug": "landing-hero-copy",
        "name": "Landing hero copy",
        "category": "Website",
        "plan": "pro",
        "description": "Linear/Vercel-grade headline + sub + dual CTA for any product.",
        "prompt": (
            "You are a top-tier SaaS copywriter. Write a hero section for {{product}} "
            "targeting {{audience}}. Output: 1 headline (max 8 words), 1 subheadline "
            "(max 24 words, benefit-led), 1 primary CTA (2-3 words), 1 secondary CTA. "
            "Tone: confident, premium, zero buzzwords."
        ),
        "models": ["ChatGPT", "Claude", "Gemini"],
        "gradient": ["#3B82F6", "#1E40AF"],
        "image_keyword": "landing page hero",
    },
    {
        "slug": "pricing-page-skeleton",
        "name": "Pricing page skeleton",
        "category": "Website",
        "plan": "pro",
        "description": "Three-tier pricing layout with features + objection-handler FAQs.",
        "prompt": (
            "Design a 3-tier pricing page for {{product}} ({{tier_anchor}}). "
            "Return JSON with tiers[] (name, price, cadence, audience, 5 features, cta) "
            "and 5 FAQ entries that address common objections."
        ),
        "models": ["ChatGPT", "Claude"],
        "gradient": ["#1E40AF", "#06B6D4"],
        "image_keyword": "pricing page",
    },
    {
        "slug": "about-page-story",
        "name": "About page story",
        "category": "Website",
        "plan": "pro",
        "description": "Founders’ story with mission, values and team voice.",
        "prompt": (
            "Write a 300-word About page for {{company}}. Open with a vivid origin moment, "
            "land on the mission, list 3 values, end on a confident invitation. "
            "Avoid clichés like “we believe” and “revolutionize.”"
        ),
        "models": ["ChatGPT", "Claude"],
        "gradient": ["#0EA5E9", "#3B82F6"],
        "image_keyword": "team office",
    },

    # ---------- CODING (PRO) ----------
    {
        "slug": "react-refactor",
        "name": "React component refactor",
        "category": "Coding",
        "plan": "pro",
        "description": "Refactors a React component into idiomatic, testable code.",
        "prompt": (
            "Refactor the following React component for readability, accessibility and "
            "performance. Extract reusable hooks, add prop-types/TS types, add ARIA where "
            "missing, keep behaviour identical. Return only the new code.\n\n"
            "```jsx\n{{code}}\n```"
        ),
        "models": ["Claude", "ChatGPT", "Cursor"],
        "gradient": ["#10B981", "#0EA5E9"],
        "image_keyword": "code editor",
    },
    {
        "slug": "sql-optimizer",
        "name": "SQL optimizer",
        "category": "Coding",
        "plan": "pro",
        "description": "Rewrites slow SQL for Postgres with EXPLAIN-aware suggestions.",
        "prompt": (
            "Optimize this Postgres query for production. Return: optimized SQL, the indexes "
            "you would add, and a one-paragraph rationale. Assume {{row_count}} rows.\n\n"
            "```sql\n{{query}}\n```"
        ),
        "models": ["Claude", "ChatGPT"],
        "gradient": ["#3B82F6", "#06B6D4"],
        "image_keyword": "database",
    },
    {
        "slug": "bug-hunter",
        "name": "Bug hunter",
        "category": "Coding",
        "plan": "pro",
        "description": "Finds and fixes a bug given the failing test + stack trace.",
        "prompt": (
            "You are a senior engineer. Given the failing test, stack trace and code, "
            "identify the root cause, propose the minimal fix, and explain why other obvious "
            "fixes are wrong.\n\nTest:\n{{test}}\n\nTrace:\n{{trace}}\n\nCode:\n{{code}}"
        ),
        "models": ["Claude", "ChatGPT", "Cursor"],
        "gradient": ["#06B6D4", "#10B981"],
        "image_keyword": "debugging",
    },

    # ---------- APP DEVELOPMENT (PRO) ----------
    {
        "slug": "feature-spec",
        "name": "Feature spec writer",
        "category": "App Development",
        "plan": "pro",
        "description": "PRD-grade spec from a 1-liner feature idea.",
        "prompt": (
            "Turn this feature idea into a one-page PRD for {{product}}: problem statement, "
            "user stories, success metrics, edge cases, non-goals, rollout plan.\n\nIdea: {{idea}}"
        ),
        "models": ["ChatGPT", "Claude", "Gemini"],
        "gradient": ["#3B82F6", "#10B981"],
        "image_keyword": "product spec",
    },
    {
        "slug": "user-flow-mapper",
        "name": "User flow mapper",
        "category": "App Development",
        "plan": "pro",
        "description": "Generates a step-by-step happy-path + error states.",
        "prompt": (
            "Map the user flow for {{feature}} in {{app}}. Output a numbered happy-path, "
            "then a list of 5 likely error/edge states with the UX response for each."
        ),
        "models": ["ChatGPT", "Claude"],
        "gradient": ["#10B981", "#3B82F6"],
        "image_keyword": "user flow",
    },
    {
        "slug": "release-notes",
        "name": "Release notes",
        "category": "App Development",
        "plan": "pro",
        "description": "Linear/Notion-style changelog from a list of merged PRs.",
        "prompt": (
            "Write release notes for {{version}} based on this list of merged PRs. "
            "Group by Added / Improved / Fixed. Lead each line with an action verb. "
            "Keep it under 180 words.\n\nPRs:\n{{prs}}"
        ),
        "models": ["Claude", "ChatGPT"],
        "gradient": ["#06B6D4", "#3B82F6"],
        "image_keyword": "release notes",
    },

    # ---------- MARKETING (PRO) ----------
    {
        "slug": "twitter-thread",
        "name": "High-engagement Twitter thread",
        "category": "Marketing",
        "plan": "pro",
        "description": "10-tweet thread engineered for saves + reposts.",
        "prompt": (
            "Write a 10-tweet thread about {{topic}} for {{audience}}. Tweet 1 is a "
            "stop-the-scroll hook (≤220 chars). Each tweet ends on a curiosity gap. "
            "Tweet 10 is a clean CTA. Avoid emojis and hashtags."
        ),
        "models": ["ChatGPT", "Claude"],
        "gradient": ["#3B82F6", "#0EA5E9"],
        "image_keyword": "social media",
    },
    {
        "slug": "cold-email",
        "name": "Cold email that converts",
        "category": "Marketing",
        "plan": "pro",
        "description": "60-word cold email with reply-bait subject line.",
        "prompt": (
            "Write a 60-word cold email from {{sender_role}} at {{company}} to {{prospect_role}} "
            "at {{prospect_company}}. Pain point: {{pain}}. Include a 1-line P.S. and a "
            "subject line under 6 words. Tone: peer-to-peer, no fluff."
        ),
        "models": ["ChatGPT", "Claude"],
        "gradient": ["#1E40AF", "#3B82F6"],
        "image_keyword": "email marketing",
    },
    {
        "slug": "brand-voice-guide",
        "name": "Brand voice guide",
        "category": "Marketing",
        "plan": "pro",
        "description": "A one-page voice & tone guide from 3 reference samples.",
        "prompt": (
            "Analyze these 3 writing samples from {{brand}}. Output a brand voice guide: "
            "3 voice traits (each with a 1-line definition and a do/don't), 5 vocabulary "
            "musts, 5 vocabulary avoids, and a sample paragraph rewritten in voice.\n\n{{samples}}"
        ),
        "models": ["Claude", "ChatGPT"],
        "gradient": ["#0EA5E9", "#1E40AF"],
        "image_keyword": "brand identity",
    },

    # ---------- WRITING (PRO) ----------
    {
        "slug": "blog-outline",
        "name": "Blog outline",
        "category": "Writing",
        "plan": "pro",
        "description": "SEO-aware outline with H2/H3, intent and CTA.",
        "prompt": (
            "Create a detailed blog outline for the topic '{{topic}}' targeting the keyword "
            "'{{keyword}}'. Include search intent, H2 + H3 structure, key statistics to look up, "
            "internal-link opportunities and a final CTA."
        ),
        "models": ["ChatGPT", "Claude", "Gemini"],
        "gradient": ["#3B82F6", "#06B6D4"],
        "image_keyword": "writing blog",
    },
    {
        "slug": "essay-rewriter",
        "name": "Essay rewriter",
        "category": "Writing",
        "plan": "pro",
        "description": "Rewrites academic / longform text to a target reading level.",
        "prompt": (
            "Rewrite the text below at a {{target_grade}} reading level while preserving every "
            "argument and citation. Keep sentence count within ±10% of the original.\n\n{{text}}"
        ),
        "models": ["Claude", "ChatGPT"],
        "gradient": ["#10B981", "#0EA5E9"],
        "image_keyword": "writing",
    },
    {
        "slug": "story-starter",
        "name": "Story starter",
        "category": "Writing",
        "plan": "pro",
        "description": "3 distinct opening paragraphs for a short story.",
        "prompt": (
            "Give me 3 distinct opening paragraphs for a short story with the premise: "
            "{{premise}}. One should be lyrical, one minimalist, one dialogue-driven. "
            "End each on a question that pulls the reader forward."
        ),
        "models": ["Claude", "ChatGPT"],
        "gradient": ["#0EA5E9", "#3B82F6"],
        "image_keyword": "story writing",
    },

    # ---------- VIDEO (PRO) ----------
    {
        "slug": "youtube-script",
        "name": "YouTube 8-min script",
        "category": "Video",
        "plan": "pro",
        "description": "Hook → content → retention beats → CTA, segmented by time.",
        "prompt": (
            "Write an 8-minute YouTube script on {{topic}} for {{channel}} ({{niche}}). "
            "Include: 0:00 hook, retention beats at 1:30 / 3:30 / 5:30, B-roll cues in "
            "[brackets], and a 1-sentence CTA. Keep voice {{voice}}."
        ),
        "models": ["ChatGPT", "Claude"],
        "gradient": ["#3B82F6", "#1E40AF"],
        "image_keyword": "video production",
    },
    {
        "slug": "shorts-hook",
        "name": "Shorts hook generator",
        "category": "Video",
        "plan": "pro",
        "description": "10 hook variants ≤7 seconds for TikTok / Reels / Shorts.",
        "prompt": (
            "Generate 10 short-form video hooks (≤7 seconds spoken) for {{topic}}. "
            "Mix curiosity, contrarian, list-promise and personal-stake styles. "
            "Include a one-line on-screen text overlay for each."
        ),
        "models": ["ChatGPT", "Claude"],
        "gradient": ["#06B6D4", "#3B82F6"],
        "image_keyword": "tiktok shorts",
    },

    # ---------- IMAGE EDITING (PRO) ----------
    {
        "slug": "background-swap",
        "name": "Background swap",
        "category": "Image Editing",
        "plan": "pro",
        "description": "Photoshop-grade background replacement instructions.",
        "prompt": (
            "Replace the background of the uploaded image with {{new_background}}. "
            "Match the original key-light direction and color temperature. Add a soft "
            "contact shadow under the subject. Output a 2048×2048 PNG."
        ),
        "models": ["Adobe Firefly", "Stable Diffusion", "Flux"],
        "gradient": ["#10B981", "#06B6D4"],
        "image_keyword": "photo editing",
    },
    {
        "slug": "style-transfer",
        "name": "Style transfer",
        "category": "Image Editing",
        "plan": "pro",
        "description": "Retains content, restyles to a target artistic look.",
        "prompt": (
            "Restyle this image in the visual language of {{style_reference}}. Preserve subject "
            "identity and composition, restyle only color, brushwork, and lighting."
        ),
        "models": ["Stable Diffusion", "Flux", "Adobe Firefly"],
        "gradient": ["#3B82F6", "#10B981"],
        "image_keyword": "art style",
    },

    # ---------- BUSINESS (PRO) ----------
    {
        "slug": "pitch-deck",
        "name": "Pitch deck outline",
        "category": "Business",
        "plan": "pro",
        "description": "10-slide investor deck outline with talking points.",
        "prompt": (
            "Outline a 10-slide investor pitch deck for {{company}} raising {{stage}}. "
            "For each slide: title, 3 bullet talking points, and the single number that should "
            "anchor the slide."
        ),
        "models": ["ChatGPT", "Claude"],
        "gradient": ["#1E40AF", "#3B82F6"],
        "image_keyword": "pitch deck",
    },
    {
        "slug": "okr-writer",
        "name": "OKR writer",
        "category": "Business",
        "plan": "pro",
        "description": "Quarterly OKRs from a team's high-level mission.",
        "prompt": (
            "Write Q{{quarter}} OKRs for the {{team}} team at {{company}}. 3 Objectives, "
            "each with 3 measurable Key Results. Each KR must include a baseline and a target."
        ),
        "models": ["ChatGPT", "Claude"],
        "gradient": ["#06B6D4", "#1E40AF"],
        "image_keyword": "strategy",
    },

    # ---------- AI AGENTS (PRO) ----------
    {
        "slug": "research-agent",
        "name": "Deep-research agent",
        "category": "AI Agents",
        "plan": "pro",
        "description": "Multi-step research agent system prompt with citations.",
        "prompt": (
            "You are a deep-research agent. For the topic '{{topic}}' you will (1) plan 5 "
            "subquestions, (2) for each, search and synthesize 2 reputable sources, (3) "
            "produce a 600-word briefing with inline citations [1], [2]... and a citation list."
        ),
        "models": ["Claude", "ChatGPT", "Gemini"],
        "gradient": ["#3B82F6", "#06B6D4"],
        "image_keyword": "research",
    },
    {
        "slug": "code-review-agent",
        "name": "Code review agent",
        "category": "AI Agents",
        "plan": "pro",
        "description": "Reviews a PR diff and produces actionable comments.",
        "prompt": (
            "You are a senior code reviewer. Review the diff below for correctness, "
            "performance, security and readability. Output structured JSON: comments[] "
            "(file, line, severity, suggestion).\n\nDiff:\n{{diff}}"
        ),
        "models": ["Claude", "Cursor", "ChatGPT"],
        "gradient": ["#10B981", "#3B82F6"],
        "image_keyword": "code review",
    },
]
