from pathlib import Path
import re

server = Path("backend/server.py")
text = server.read_text()

text = text.replace("import httpx\n", "")
text = text.replace('EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"\n', "")
text = re.sub(r'\nclass GoogleSessionBody\(BaseModel\):\n    session_id: str\n', "\n", text)
text = re.sub(r'\n# --- Auth: Google \(Emergent Managed OAuth\) ---.*?\n# --- Newsletter ---', "\n# --- Newsletter ---", text, flags=re.S)

optimize = '''
@api.post("/generate/optimize")
async def optimize_prompt(body: OptimizeBody, user: dict = Depends(get_current_user)):
    user = await maybe_refill_credits(user)
    balance = int(user.get("credits_balance", 0))
    if user.get("subscription") != "pro" and balance < OPTIMIZE_COST:
        raise HTTPException(status_code=402, detail=f"Not enough credits. You need {OPTIMIZE_COST} but have {balance}. Upgrade to Pro for unlimited credits.")

    instruction = (
        "You are PromptAI's prompt-engineering co-pilot. Given a user's plain-English idea, "
        "target AI model and category, produce one polished, production-ready prompt that is "
        "idiomatic for that model and category. Output ONLY the optimized prompt, with no preamble, "
        "quotes or commentary. Preserve proper nouns and concrete details. Keep it under 220 words."
    )
    nl = chr(10)
    user_text = f"Target model: {body.model}{nl}Category: {body.category}{nl}User idea:{nl}{body.idea.strip()}"
    try:
        from services.nimo_client import generate_text
        optimized = await generate_text(instruction=instruction, user_text=user_text, request_id=f"optimize-{uuid.uuid4().hex[:12]}")
    except Exception as exc:
        logger.exception("NIMO-CORE optimizer call failed")
        raise HTTPException(status_code=502, detail=f"Optimizer is unavailable right now: {exc}")

    user = await consume_credits(user, OPTIMIZE_COST)
    history_doc = {
        "history_id": uuid.uuid4().hex,
        "user_id": user["user_id"],
        "kind": "optimize",
        "promptlet_name": (body.idea.strip().split(nl)[0][:80] or "Custom prompt"),
        "category": body.category,
        "model": body.model,
        "idea": body.idea.strip(),
        "prompt": optimized,
        "cost": OPTIMIZE_COST,
        "created_at": now_iso(),
    }
    await db.prompt_history.insert_one(history_doc)
    return {"ok": True, "prompt": optimized, "credits": credit_summary(user), "cost": OPTIMIZE_COST, "history_id": history_doc["history_id"]}


@api.post("/generate/save")'''
text, n1 = re.subn(r'\n@api.post\("/generate/optimize"\).*?\n@api.post\("/generate/save"\)', optimize, text, flags=re.S)
if n1 != 1:
    raise SystemExit(f"optimizer block replacement count={n1}")

convert = '''
@api.post("/convert")
async def convert_prompt(body: ConvertBody, user: dict = Depends(get_current_user)):
    user = await maybe_refill_credits(user)
    balance = int(user.get("credits_balance", 0))
    if user.get("subscription") != "pro" and balance < CONVERT_COST:
        raise HTTPException(status_code=402, detail=f"Need {CONVERT_COST} credits, have {balance}.")

    instruction = (
        "You are PromptAI's prompt converter. Convert a prompt written for one AI model into the "
        "idiomatic, production-ready form for another AI model. Output ONLY the converted prompt, "
        "with no preamble, quotes or commentary. Preserve all concrete details and intent. "
        "Keep it under 240 words."
    )
    nl = chr(10)
    user_text = f"SOURCE MODEL: {body.source_model}{nl}TARGET MODEL: {body.target_model}{nl}{nl}ORIGINAL PROMPT:{nl}{body.prompt.strip()}"
    try:
        from services.nimo_client import generate_text
        converted = await generate_text(instruction=instruction, user_text=user_text, request_id=f"convert-{uuid.uuid4().hex[:12]}")
    except Exception as exc:
        logger.exception("NIMO-CORE converter call failed")
        raise HTTPException(status_code=502, detail=f"Converter is unavailable right now: {exc}")

    user = await consume_credits(user, CONVERT_COST)
    history_doc = {
        "history_id": uuid.uuid4().hex,
        "user_id": user["user_id"],
        "kind": "convert",
        "promptlet_name": f"Convert {body.source_model} → {body.target_model}",
        "category": "Convert",
        "model": body.target_model,
        "idea": body.prompt.strip()[:200],
        "prompt": converted,
        "cost": CONVERT_COST,
        "created_at": now_iso(),
    }
    await db.prompt_history.insert_one(history_doc)
    return {"ok": True, "prompt": converted, "credits": credit_summary(user), "cost": CONVERT_COST}


# ---------------------------------------------------------------------------
# Admin'''
text, n2 = re.subn(r'\n@api.post\("/convert"\).*?\n# ---------------------------------------------------------------------------\n# Admin', convert, text, flags=re.S)
if n2 != 1:
    raise SystemExit(f"converter block replacement count={n2}")
server.write_text(text)

tests = Path("backend/tests/backend_test.py")
if tests.exists():
    test_text = tests.read_text().replace("https://prompt-craft-demo.preview.emergentagent.com", "http://localhost:8001")
    tests.write_text(test_text)
