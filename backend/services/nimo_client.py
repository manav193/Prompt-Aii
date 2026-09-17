"""Small server-side client for the NIMO-CORE intelligence gateway."""

import os
from typing import Optional

import httpx


class NimoCoreError(RuntimeError):
    """Raised when NIMO-CORE cannot complete an intelligence request."""


async def generate_text(
    *,
    instruction: str,
    user_text: str,
    request_id: Optional[str] = None,
    context: Optional[dict] = None,
) -> str:
    """Ask NIMO-CORE for a single text result without exposing provider keys to PromptAI.

    ``context`` is optional and bounded to JSON-object metadata. Prompt-Aii uses it
    to identify the governed project context without sending provider credentials.
    """
    base_url = os.environ.get("NIMO_CORE_URL", "http://localhost:8787").rstrip("/")
    timeout = float(os.environ.get("NIMO_CORE_TIMEOUT_MS", "15000")) / 1000
    integration_key = os.environ.get("NIMO_INTEGRATION_KEY")

    message = f"SYSTEM INSTRUCTION:\n{instruction.strip()}\n\nUSER INPUT:\n{user_text.strip()}"
    headers = {"Content-Type": "application/json"}
    if request_id:
        headers["X-Request-ID"] = request_id
    if integration_key:
        headers["Authorization"] = f"Bearer {integration_key}"

    safe_context = context if isinstance(context, dict) else {}
    # Keep the integration contract intentionally small: project identity and
    # governance mode are metadata, never credentials or raw conversation state.
    safe_context = {
        key: value
        for key, value in safe_context.items()
        if key in {"projectId", "governedKnowledge"} and isinstance(value, str)
    }

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
