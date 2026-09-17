"""PromptAI response feedback persistence boundary.

Raw feedback stays in the private application database. It is not written to
NIMO-KNOWLEDGE or GitHub. Downstream evaluation must sanitize/aggregate it
before any knowledge promotion.
"""

from datetime import datetime, timezone
from typing import Optional

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
        return {"success": True, "feedback": body.feedback, "learning_eligible": body.feedback in {"like", "dislike"}}

    return api
