"""Small server-side client for the NIMO-CORE intelligence gateway."""

import os
import re
from typing import Optional

import httpx

from .model_strategy import resolve_model_strategy
from .prompt_composer import compose_optimizer_context, compose_strategy_instruction


class NimoCoreError(RuntimeError):
    """Raised when NIMO-CORE cannot complete an intelligence request."""


PROMPT_AII_PROJECT_ID = "prompt-aii"
PROMPT_AII_KNOWLEDGE_ID = "kno-20260917-prompt-aii-deep-prompt-engineering"


async def generate_text(
    *,
    instruction: str,
    user_text: str,
    request_id: Optional[str] = None,
    context: Optional[dict] = None,
) -> str:
    """Ask NIMO-CORE for a single text result without exposing provider keys to PromptAI.

    ``context`` is optional and bounded to JSON-object metadata. Prompt-Aii uses it
    to identify the governed project context and optional prompt depth without
    sending provider credentials.
    """
    base_url = os.environ.get("NIMO_CORE_URL", "http://localhost:8787").rstrip("/")
    timeout = float(os.environ.get("NIMO_CORE_TIMEOUT_MS", "15000")) / 1000
    integration_key = os.environ.get("NIMO_INTEGRATION_KEY")

    safe_context = context if isinstance(context, dict) else {}
    safe_context = {
        key: value
        for key, value in safe_context.items()
        if key in {"projectId", "governedKnowledge", "promptDepth"}
        and isinstance(value, str)
    }
    safe_context.setdefault("projectId", PROMPT_AII_PROJECT_ID)
    safe_context.setdefault("governedKnowledge", PROMPT_AII_KNOWLEDGE_ID)

    # The existing optimizer endpoint encodes its target model/category in the
    # user text. Resolve those bounded values here so model strategy is applied
    # without requiring a risky server.py rewrite. Callers that need high-level
    # mode can provide promptDepth explicitly; deep remains the safe default.
    model_match = re.search(r"^Target model:\s*(.+)$", user_text, re.MULTILINE | re.IGNORECASE)
    category_match = re.search(r"^Category:\s*(.+)$", user_text, re.MULTILINE | re.IGNORECASE)
    model = model_match.group(1).strip() if model_match else ""
    category = category_match.group(1).strip() if category_match else "general"
    depth = safe_context.get("promptDepth", "deep")
    if model:
        try:
            strategy = resolve_model_strategy(model, depth)
            strategy_context = compose_optimizer_context(strategy, category)
            instruction = f"{instruction.strip()}\n\nGOVERNED MODEL STRATEGY:\n{compose_strategy_instruction(strategy)}"
            safe_context["promptDepth"] = strategy_context["depth"]
        except ValueError:
            # Invalid optional depth must never break existing callers; use the
            # deterministic deep default for supported model names.
            strategy = resolve_model_strategy(model, "deep")
            instruction = f"{instruction.strip()}\n\nGOVERNED MODEL STRATEGY:\n{compose_strategy_instruction(strategy)}"
            safe_context["promptDepth"] = "deep"

    message = f"SYSTEM INSTRUCTION:\n{instruction}\n\nUSER INPUT:\n{user_text.strip()}"
    headers = {"Content-Type": "application/json"}
    if request_id:
        headers["X-Request-ID"] = request_id
    if integration_key:
        headers["Authorization"] = f"Bearer {integration_key}"

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{base_url}/api/nimo/chat",
                json={"message": message, "context": safe_context},
                headers=headers,
            )
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise NimoCoreError(f"NIMO-CORE request failed: {exc}") from exc

    if not payload.get("success"):
        raise NimoCoreError(payload.get("error") or "NIMO-CORE returned an unsuccessful response")

    text = str(payload.get("reply") or "").strip()
    if not text:
        raise NimoCoreError("NIMO-CORE returned an empty response")
    return text
