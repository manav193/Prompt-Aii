"""Compose bounded Prompt-Aii instructions from a selected model strategy.

This module is deterministic and credential-free. It never stores or sends user
prompt content and does not make provider calls.
"""

from .model_strategy import ModelStrategy


def compose_strategy_instruction(strategy: ModelStrategy) -> str:
    """Return a concise, model-family-aware instruction for an optimizer."""
    sections = ", ".join(strategy.required_sections)
    return (
        f"Target model: {strategy.model}.\n"
        f"Mode: {strategy.depth}.\n"
        f"Strategy: {strategy.system_focus}\n"
        f"Required prompt sections: {sections}.\n"
        "Preserve the user's intent. Do not invent requirements. "
        "Return only the optimized prompt unless the caller explicitly requests metadata."
    )


def compose_optimizer_context(strategy: ModelStrategy, category: str) -> dict[str, str]:
    """Build the bounded context payload for the Prompt-Aii optimizer."""
    normalized_category = " ".join(str(category or "").strip().lower().split())
    return {
        "model": strategy.model,
        "family": strategy.family,
        "depth": strategy.depth,
        "category": normalized_category or "general",
        "strategy_instruction": compose_strategy_instruction(strategy),
    }
