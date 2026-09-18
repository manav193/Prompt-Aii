import pytest

from services.nimo_client import PROMPT_AII_KNOWLEDGE_ID


def test_prompt_aii_governance_constants_are_stable():
    assert PROMPT_AII_KNOWLEDGE_ID == "kno-20260917-prompt-aii-deep-prompt-engineering"


def test_model_strategy_is_applied_by_client_imports():
    from services.model_strategy import resolve_model_strategy
    from services.prompt_composer import compose_strategy_instruction

    strategy = resolve_model_strategy("Midjourney", "deep")
    instruction = compose_strategy_instruction(strategy)
    assert strategy.family == "image"
    assert strategy.depth == "deep"
    assert "negative_constraints" in strategy.required_sections
    assert "Target model: midjourney." in instruction


def test_high_level_strategy_remains_available():
    from services.model_strategy import resolve_model_strategy

    strategy = resolve_model_strategy("ChatGPT", "high-level")
    assert strategy.family == "reasoning"
    assert strategy.depth == "high-level"
    assert "objective" in strategy.required_sections


@pytest.mark.asyncio
async def test_generate_text_sends_governed_strategy_to_nimo_core(monkeypatch):
    import services.nimo_client as nimo_client

    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"success": True, "reply": "governed result"}

    class FakeClient:
        def __init__(self, **kwargs):
            captured["timeout"] = kwargs["timeout"]

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, url, *, json, headers):
            captured["url"] = url
            captured["json"] = json
            captured["headers"] = headers
            return FakeResponse()

    monkeypatch.setattr(nimo_client.httpx, "AsyncClient", FakeClient)
    monkeypatch.setenv("NIMO_CORE_URL", "http://nimo-core.test")

    result = await nimo_client.generate_text(
        instruction="Optimize the prompt.",
        user_text="Target model: Midjourney\nCategory: image\nPrompt depth: high-level\nA cinematic portrait",
        request_id="req-test-1",
    )

    assert result == "governed result"
    assert captured["url"] == "http://nimo-core.test/api/nimo/chat"
    assert captured["headers"]["X-Request-ID"] == "req-test-1"
    assert captured["json"]["context"] == {
        "projectId": "prompt-aii",
        "governedKnowledge": PROMPT_AII_KNOWLEDGE_ID,
        "promptDepth": "high-level",
    }
    assert "GOVERNED MODEL STRATEGY:" in captured["json"]["message"]
    assert "Target model: midjourney." in captured["json"]["message"]
