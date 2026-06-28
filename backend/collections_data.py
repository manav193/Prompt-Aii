"""Curated collections served by /api/collections. Each entry is matched to
promptlets via category match OR a `slugs` whitelist. No fictional content.
"""

# Image-keyword aware Unsplash cover URLs. Each is a category-themed
# editorial photo at fixed aspect / quality so previews look consistent.
def _cover(seed: str) -> str:
    return (
        "https://images.unsplash.com/photo-" + seed +
        "?auto=format&fit=crop&w=1400&q=70"
    )


COLLECTIONS = [
    {
        "slug": "best-chatgpt-prompts",
        "name": "Best ChatGPT Prompts",
        "subtitle": "Hand-picked prompts that play to GPT's natural strengths.",
        "model": "ChatGPT",
        "cover": _cover("1677442136019-21780ecad995"),
        "gradient": ["#10A37F", "#0EA5E9"],
    },
    {
        "slug": "best-claude-prompts",
        "name": "Best Claude Prompts",
        "subtitle": "Long-form reasoning and writing prompts tuned for Claude.",
        "model": "Claude",
        "cover": _cover("1655720035881-1f10b75b3ee1"),
        "gradient": ["#D97757", "#3B82F6"],
    },
    {
        "slug": "best-midjourney-prompts",
        "name": "Best Midjourney Prompts",
        "subtitle": "Editorial-grade image prompts with parameters dialed in.",
        "model": "Midjourney",
        "cover": _cover("1547891654-e66ed7ebb968"),
        "gradient": ["#0F172A", "#06B6D4"],
    },
    {
        "slug": "graphic-design",
        "name": "Graphic Design",
        "subtitle": "Image Editing, brand and visual identity prompts.",
        "categories": ["Image Editing", "Photo"],
        "cover": _cover("1561070791-2526d30994b8"),
        "gradient": ["#06B6D4", "#3B82F6"],
    },
    {
        "slug": "coding",
        "name": "Coding",
        "subtitle": "Refactor, optimize and debug across stacks.",
        "categories": ["Coding"],
        "cover": _cover("1542831371-29b0f74f9713"),
        "gradient": ["#10B981", "#0EA5E9"],
    },
    {
        "slug": "website-development",
        "name": "Website Development",
        "subtitle": "Hero copy, pricing, about — production-ready prompts.",
        "categories": ["Website", "App Development"],
        "cover": _cover("1559028012-481c04fa702d"),
        "gradient": ["#3B82F6", "#06B6D4"],
    },
    {
        "slug": "instagram",
        "name": "Instagram",
        "subtitle": "Captions, hooks and visuals built for scroll-stoppers.",
        "categories": ["Marketing", "Photo", "Video"],
        "cover": _cover("1611605698335-8b1569810432"),
        "gradient": ["#EC4899", "#3B82F6"],
    },
    {
        "slug": "marketing",
        "name": "Marketing",
        "subtitle": "Threads, cold emails and brand voice work.",
        "categories": ["Marketing"],
        "cover": _cover("1557804506-669a67965ba0"),
        "gradient": ["#3B82F6", "#1E40AF"],
    },
    {
        "slug": "business",
        "name": "Business",
        "subtitle": "Decks, OKRs and operating documents.",
        "categories": ["Business"],
        "cover": _cover("1573164713714-d95e436ab8d6"),
        "gradient": ["#1E40AF", "#06B6D4"],
    },
    {
        "slug": "students",
        "name": "Students",
        "subtitle": "Essays, study plans and research workflows.",
        "categories": ["Writing", "AI Agents"],
        "cover": _cover("1523240795612-9a054b0db644"),
        "gradient": ["#0EA5E9", "#10B981"],
    },
    {
        "slug": "freelancers",
        "name": "Freelancers",
        "subtitle": "Client comms, scoping and deliverable prompts.",
        "categories": ["Marketing", "Writing", "Business"],
        "cover": _cover("1521737604893-d14cc237f11d"),
        "gradient": ["#06B6D4", "#10B981"],
    },
    {
        "slug": "photography",
        "name": "Photography",
        "subtitle": "Portraits, products and editorial scenes.",
        "categories": ["Photo"],
        "cover": _cover("1502920917128-1aa500764cbd"),
        "gradient": ["#0EA5E9", "#3B82F6"],
    },
]


CATEGORY_DEFAULTS = {
    "Photo":          {"difficulty": "Beginner",     "credits": 2, "image_seed": "1502920917128-1aa500764cbd"},
    "Website":        {"difficulty": "Intermediate", "credits": 1, "image_seed": "1559028012-481c04fa702d"},
    "Coding":         {"difficulty": "Advanced",     "credits": 1, "image_seed": "1542831371-29b0f74f9713"},
    "App Development":{"difficulty": "Intermediate", "credits": 1, "image_seed": "1551434678-e076c223a692"},
    "Marketing":      {"difficulty": "Beginner",     "credits": 1, "image_seed": "1557804506-669a67965ba0"},
    "Writing":        {"difficulty": "Beginner",     "credits": 1, "image_seed": "1455390582262-044cdead277a"},
    "Video":          {"difficulty": "Intermediate", "credits": 1, "image_seed": "1492691527719-9d1e07e534b4"},
    "Image Editing":  {"difficulty": "Intermediate", "credits": 2, "image_seed": "1556761175-5973dc0f32e7"},
    "Business":       {"difficulty": "Intermediate", "credits": 1, "image_seed": "1573164713714-d95e436ab8d6"},
    "AI Agents":      {"difficulty": "Advanced",     "credits": 2, "image_seed": "1485827404703-89b55fcc595e"},
}

HOW_TO_USE_BY_CATEGORY = {
    "Photo": "Replace each {{placeholder}} with concrete details (subject, environment, mood). Run in your image model of choice; iterate by tweaking lighting and aspect-ratio parameters.",
    "Website": "Paste this into ChatGPT or Claude with your product name + audience. Use the JSON output (when applicable) to seed your component data.",
    "Coding": "Paste the code or query into the {{placeholder}} block. The model will return drop-in replacements — review the diff before merging.",
    "App Development": "Use this prompt to brief your AI co-pilot during planning. Save the output as a working spec in your tracker.",
    "Marketing": "Fill in your topic + audience. Run twice with different temperatures and A/B test the openings.",
    "Writing": "Pair this with your own examples for stronger voice transfer. Iterate on the second pass with the model's feedback.",
    "Video": "Use the produced script as a structure — record cuts on retention beats and capture B-roll for bracketed cues.",
    "Image Editing": "Apply to your source image in an image model with mask + reference image support. Adjust strength to taste.",
    "Business": "Drop the result into Notion, Linear or your slide tool. Add numbers; the model leaves them as anchors.",
    "AI Agents": "Drop this into your agent's system prompt. Wire tools (search, code-runner) before running for best results.",
}

EXPECTED_OUTPUT_BY_CATEGORY = {
    "Photo": "An editorial-grade image with controlled lighting, composition and mood — ready for landing pages or social.",
    "Website": "Conversion-ready copy or structured JSON for hero / pricing / about sections.",
    "Coding": "Drop-in refactored code with clear rationale and added type/ARIA coverage.",
    "App Development": "A concise PRD with user stories, success metrics, edge cases and a rollout plan.",
    "Marketing": "A scroll-stopping thread, cold email, or voice/tone guide ready for publish.",
    "Writing": "Rewrites and outlines tuned to your reading level, voice and citation style.",
    "Video": "A structured script with hook, retention beats, B-roll cues and a CTA.",
    "Image Editing": "A clean edit honoring lighting, color and composition of the original.",
    "Business": "Decks, OKRs and operating docs with measurable structure.",
    "AI Agents": "A system prompt and tool-aware plan ready for agent loops.",
}


def cover_image(seed: str) -> str:
    return _cover(seed)
