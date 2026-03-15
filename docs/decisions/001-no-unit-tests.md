---
title: "ADR-001: No Unit Tests"
status: accepted
date: 2026-03-15
---

# ADR-001: No Unit Tests

## Context

Aether is a personal dashboard with significant AI-driven functionality. The codebase has Vitest configured but no tests have been written.

## Decision

We will not invest in unit tests for this project.

## Rationale

1. **Indeterminate AI structure** — A large portion of the codebase deals with AI chat, tool orchestration, and Obsidian integration where inputs/outputs are non-deterministic. Writing meaningful tests for these paths would require extensive mocking that provides little confidence.

2. **Single user, solo developer** — There is no team coordination risk that tests typically mitigate. The cost of a bug reaching "production" is low — it's a personal tool.

3. **Rapidly evolving** — Features are being added and iterated on quickly. Maintaining test suites for code that changes shape frequently creates friction without proportional value.

4. **Type safety as primary guardrail** — TypeScript strict mode, Biome linting, and Zod validation at boundaries provide meaningful compile-time and runtime safety without the maintenance burden of test suites.

## Consequences

- We accept higher risk of regressions in utility/pure functions (cost calculations, date formatting, etc.)
- We rely on TypeScript, linting, and manual testing as primary quality gates
- If the project ever becomes multi-user or team-maintained, this decision should be revisited
