# PromptAI ↔ NIMO Implementation Plan

## Purpose
Complete the governed integration between Prompt-Aii (the user-facing prompt-engineering product), NIMO-CORE (the internal intelligence/orchestration layer), and NIMO-KNOWLEDGE (the governed knowledge layer).

NIMO-CORE is not a standalone PromptAI product feature. PromptAI remains the product; NIMO-CORE provides internal intelligence and learning orchestration.

## Execution rules
1. Work one step at a time; never bundle unrelated changes.
2. After every implementation step, verify PromptAI, NIMO-CORE, and NIMO-KNOWLEDGE integrity.
3. Check the public Vercel deployment after every step when a deployment URL is discoverable/accesssible; if it cannot be verified, record that as a manual verification item rather than guessing.
4. Never commit API keys, credentials, raw private conversations, PII, or provider secrets.
5. If a change causes a regression, fix it before advancing.
6. Manual-only environment, secret, provider, database, or deployment actions must be recorded for the user.

## Phase 1 — Governed learning pipeline
- [ ] Define a PromptAI learning-event contract derived from NIMO-CORE's privacy-safe learning event model.
- [ ] Add a PromptAI-side learning emitter that sends sanitized outcome/evaluation signals to NIMO-CORE.
- [ ] Add a NIMO-CORE ingestion boundary for PromptAI learning observations, with validation, sanitization, bounded payloads, and source tagging.
- [ ] Store observations through NIMO-CORE learning infrastructure without promoting observations directly to active knowledge.
- [ ] Add evaluation/proposal generation for PromptAI patterns.
- [ ] Add a governed export/sync path for evaluated PromptAI knowledge into NIMO-KNOWLEDGE.
- [ ] Make NIMO-CORE consume only approved PromptAI knowledge catalog entries at runtime.
- [ ] Add tests for success, failure, redaction, rejection, approval gating, and malformed input.

## Phase 2 — PromptAI product capabilities
- [ ] Deep model-aware prompt generation: preserve explicit intent and intelligently expand missing context.
- [ ] Model-specific strategies for reasoning models, coding agents, and image models.
- [ ] Coding-agent prompts with repository context, files, architecture, security, tests, validation, edge cases, and definition of done.
- [ ] Image prompts with subject, composition, camera, lighting, environment, materials, style, detail, and negative constraints.
- [ ] Reverse-prompt workflow: visual decomposition followed by target-model reconstruction.
- [ ] Multi-model adaptation from one user intent.
- [ ] Promplets showcase wired to reusable, demonstrated prompt patterns.
- [ ] Quality validation so output quality is measured by task fitness rather than prompt length.

## Phase 3 — System verification and hardening
- [ ] Verify PromptAI frontend/backend integration and existing authentication/credit boundaries.
- [ ] Verify NIMO-CORE Node and Worker entrypoints use the PromptAI source consistently.
- [ ] Verify NIMO-KNOWLEDGE schema/catalog consistency and lifecycle rules.
- [ ] Run repository tests/build checks available through GitHub/CI.
- [ ] Check deployment health after each step and record any manual action required.
- [ ] Final audit: no secrets/PII/raw conversations, no unapproved knowledge activation, no broken imports/routes, and no duplicate or stale integration paths.

## Completion report
The final report will list every commit by repository, what changed, verification performed, deployment observations, failures fixed, and manual actions remaining.
