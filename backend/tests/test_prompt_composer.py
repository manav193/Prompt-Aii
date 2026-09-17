import unittest

from services.model_strategy import resolve_model_strategy
from services.prompt_composer import compose_optimizer_context, compose_strategy_instruction


class PromptComposerTests(unittest.TestCase):
    def test_deep_coding_context_is_bounded_and_model_specific(self):
        strategy = resolve_model_strategy("Cursor", "deep")
        context = compose_optimizer_context(strategy, "Coding")
        self.assertEqual(context["model"], "cursor")
        self.assertEqual(context["family"], "coding")
        self.assertEqual(context["depth"], "deep")
        self.assertIn("repository_context", context["strategy_instruction"])
        self.assertIn("security", context["strategy_instruction"])

    def test_high_level_image_context_uses_image_strategy(self):
        strategy = resolve_model_strategy("Midjourney", "high-level")
        instruction = compose_strategy_instruction(strategy)
        self.assertIn("Mode: high-level", instruction)
        self.assertIn("composition", instruction)
        self.assertIn("camera", instruction)
        self.assertNotIn("repository_context", instruction)

    def test_empty_category_defaults_to_general(self):
        strategy = resolve_model_strategy("ChatGPT", "deep")
        context = compose_optimizer_context(strategy, " ")
        self.assertEqual(context["category"], "general")


if __name__ == "__main__":
    unittest.main()
