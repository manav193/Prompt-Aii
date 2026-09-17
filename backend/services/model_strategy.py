"""Governed model-specific prompt strategy profiles for Prompt-Aii.

This module is intentionally deterministic and credential-free. It describes how
Prompt-Aii should shape a prompt for a target model family; it never calls a
provider and never stores user prompt content.
"""

from dataclasses import dataclass
from typing import Dict


@dataclass(frozen=True)
class ModelStrategy:
    """Bounded prompt-shaping guidance for one model family."""

    model: str
    family: str
    depth: str
    system_focus: str
    required_sections: tuple[str, ...]


_DEPTHS = {"high-level", "deep"}

# Keep aliases explicit so UI names remain stable while strategy families stay
# provider-agnostic. No provider credentials or model endpoints belong here.
_MODEL_FAMILIES: Dict[str, str] = {
    "chatgpt": "reasoning",
    "claude": "reasoning",
    "gemini": "reasoning",
    "cursor": "coding",
    "lovable": "coding",
    "midjourney": "image",
    "stable diffusion": "image",
    "flux": "image",
    "adobe firefly": "image",
}

_FOCUS = {
    "reasoning": {
        "high-level": "Preserve intent, clarify objective, audience, constraints, and desired output without unnecessary procedural detail.",
        "deep": "Decompose the task into explicit objective, context, constraints, evaluation criteria, edge cases, and output contract; request concise reasoning where useful without exposing hidden chain-of-thought.",
    },
    "coding": {
        "high-level": "State the engineering goal, repository context, constraints, acceptance criteria, and expected deliverable clearly.",
        "deep": "Include repository/files context, architecture, interfaces, security constraints, tests, validation, edge cases, rollback considerations, and definition of done.",
    },
    "image": {
        "high-level": "Describe subject, visual intent, composition, environment, style, and key constraints in model-native language.",
        "deep": "Specify subject, composition, camera/view, lighting, environment, materials, style, detail priorities, negative constraints, and output framing while preserving the user's creative intent.",
    },
}

_SECTIONS = {
    "reasoning": ("objective", "context", "constraints", "output_format", "success_criteria"),
    "coding": ("objective", "repository_context", "architecture", "security", "tests", "validation", "edge_cases", "definition_of_done"),
    "image": ("subject", "composition", "camera", "lighting", "environment", "materials", "style", "detail", "negative_constraints", "output_format"),
}


def resolve_model_strategy(model: str, depth: str = "deep") -> ModelStrategy:
    """Resolve a supported model into a bounded, model-family-aware strategy.

    Unknown model names use the reasoning family rather than inventing provider
    behavior. Depth is deliberately limited to the two product modes.
    """
    normalized_model = " ".join(str(model or "").strip().lower().split())
    normalized_depth = str(depth or "deep").strip().lower()
    if normalized_depth not in _DEPTHS:
        raise ValueError("depth must be 'high-level' or 'deep'")

    family = _MODEL_FAMILIES.get(normalized_model, "reasoning")
    return ModelStrategy(
        model=normalized_model or "unknown",
        family=family,
        depth=normalized_depth,
        system_focus=_FOCUS[family][normalized_depth],
        required_sections=_SECTIONS[family],
    )


def supported_model_families() -> dict[str, tuple[str, ...]]:
    """Return a stable, provider-agnostic view for UI/API validation."""
    result: dict[str, list[str]] = {}
    for model, family in _MODEL_FAMILIES.items():
        result.setdefault(family, []).append(model)
    return {family: tuple(models) for family, models in result.items()}
