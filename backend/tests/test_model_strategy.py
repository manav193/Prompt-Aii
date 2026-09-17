from services.model_strategy import resolve_model_strategy, supported_model_families


def test_model_families_cover_current_generator_models():
    families = supported_model_families()
    assert "reasoning" in families
    assert "coding" in families
    assert "image" in families
    assert "chatgpt" in families["reasoning"]
    assert "cursor" in families["coding"]
    assert "midjourney" in families["image"]


def test_depth_changes_strategy_without_exposing_chain_of_thought():
    high = resolve_model_strategy("Claude", "high-level")
    deep = resolve_model_strategy("Claude", "deep")
    assert high.family == deep.family == "reasoning"
    assert high.depth == "high-level"
    assert deep.depth == "deep"
    assert "hidden chain-of-thought" in deep.system_focus


def test_coding_and_image_models_get_distinct_sections():
    coding = resolve_model_strategy("Cursor", "deep")
    image = resolve_model_strategy("Midjourney", "deep")
    assert coding.family == "coding"
    assert "repository_context" in coding.required_sections
    assert image.family == "image"
    assert "composition" in image.required_sections
    assert coding.required_sections != image.required_sections


def test_unknown_models_use_safe_reasoning_defaults():
    strategy = resolve_model_strategy("future-model", "high-level")
    assert strategy.family == "reasoning"
    assert strategy.depth == "high-level"
