"""PromptAI response feedback persistence boundary.

Raw feedback stays in the private application database. It is not written to
NIMO-KNOWLEDGE or GitHub. Downstream evaluation must sanitize/aggregate it
before any knowledge promotion.
"""

from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field


class PromptFeedbackBody(BaseModel):
    request_id: Optional[str] = Field(default=None, max_length=128)
    feedback: str = Field(pattern="^(like|dislike|share)$")
    reason: Optional[str] = Field(default=None, max_length=500)
    idea: str = Field(min_length=1, max_length=4000)
    prompt: str = Field(min_length=1, max_length=8000)
    model: str = Field(min_length=1, max_length=40)
    category: str = Field(min_length=1, max_length=40)


async def emit_prompt_aii_learning_signal(body: PromptFeedbackBody) -> bool:
    """Emit only bounded outcome metadata to NIMO-CORE.

    Raw ideas, prompts, reasons, and user identity are intentionally excluded.
    Failure to reach NIMO-CORE must never block private feedback persistence.
    """
    if body.feedback not in {"like", "dislike"}:
        return False

    base_url = __import__("os").environ.get("NIMO_CORE_URL", "http://localhost:8787").rstrip("/")
    integration_key = __import__("os").environ.get("NIMO_INTEGRATION_KEY")
    if not integration_key:
        return False

    payload = {
        "request_id": body.request_id,
        "target": "prompt-generation",
        "model": {"model": body.model.strip()[:40]},
        "feedback": body.feedback,
        "outcome": "success" if body.feedback == "like" else "failure",
        "metadata": {
            "category": body.category.strip()[:40],
            "feedbackSource": "prompt-aii-ui",
            "signalOnly": True,
        },
    }
    headers = {"Content-Type": "application/json", "X-NIMO-INTEGRATION-KEY": integration_key}
    timeout = float(__import__("os").environ.get("NIMO_CORE_TIMEOUT_MS", "5000")) / 1000

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{base_url}/api/nimo/feedback",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            return bool(response.json().get("accepted"))
    except (httpx.HTTPError, ValueError):
        return False


def register_feedback_routes(api, db, get_current_user):
    """Attach authenticated PromptAI feedback routes to the main API router."""

    @api.post("/feedback/prompt")
    async def record_prompt_feedback(
        body: PromptFeedbackBody,
        user: dict = Depends(get_current_user),
    ):
        now = datetime.now(timezone.utc).isoformat()
        document = {
            "feedback_id": f"feedback_{__import__('uuid').uuid4().hex}",
            "user_id": user["user_id"],
            "request_id": body.request_id,
            "feedback": body.feedback,
            "reason": body.reason.strip() if body.reason else None,
            "idea": body.idea.strip(),
            "prompt": body.prompt.strip(),
            "model": body.model.strip(),
            "category": body.category.strip(),
            "created_at": now,
            "learning": {
                "eligible": body.feedback in {"like", "dislike"},
                "raw_private": True,
                "knowledge_promotion": "evaluation-required",
            },
        }
        await db.prompt_feedback.update_one(
            {"user_id": user["user_id"], "request_id": body.request_id, "feedback": {"$in": ["like", "dislike"]}},
            {"$set": document},
            upsert=True,
        ) if body.feedback in {"like", "dislike"} and body.request_id else await db.prompt_feedback.insert_one(document)

        if body.feedback in {"like", "dislike"}:
            await emit_prompt_aii_learning_signal(body)

        return {"success": True, "feedback": body.feedback, "learning_eligible": body.feedback in {"like", "dislike"}}

    return api
