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
