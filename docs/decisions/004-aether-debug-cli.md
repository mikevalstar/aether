---
title: "ADR-004: aether-debug CLI"
status: accepted
date: 2026-04-25
---

# ADR-004: `aether-debug` CLI

## Context

Diagnosing problems in Aether (a task that didn't fire, a trigger that errored, a chat that blew through token budget, a workflow that won't parse) used to require pivoting between several surfaces:

- `/logs` route in the running app — only works while the app is up.
- `/chat-debug` route — for AI configuration introspection.
- `tail logs/aether.YYYY-MM-DD.N.log | jq …` — manual NDJSON archaeology.
- Prisma Studio — clicking through `ActivityLog`, `ChatThread`, `Task`, `Trigger`, `Notification`.

This is slow for a human and even slower for an AI agent (Claude Code) repeatedly performing the same diagnostic queries while debugging. Several silent `catch { }` blocks made some failures effectively invisible.

## Decision

Ship a single `pnpm debug <subcommand>` CLI that consolidates the most common diagnostic queries:

- `logs tail|errors|search` — NDJSON-aware log inspection.
- `tasks status|run`, `workflows status`, `triggers status|fire` — DB introspection plus manual one-shot execution via the same executor the scheduler uses.
- `chat threads`, `chat thread <id>`, `usage today|week|month` — chat & cost rollups.
- `activity tail`, `notifications` — recent ActivityLog and Notification rows.
- `doctor` — connectivity / env smoke test (exits non-zero on critical failures, suitable for CI).
- `config` — same payload as `/chat-debug`, but reachable without an HTTP session.

The CLI is plain `tsx scripts/debug.ts`, following the existing script pattern (`create:first-admin`, `embeddings:backfill`). It depends only on already-installed packages (`pino`, `ndjson`, Prisma) — no new dependencies, no extra dev tooling.

The shared `getChatDebugData` server function was refactored to delegate to a new `buildChatDebugData(userId)` in `src/lib/debug/chat-debug-data.ts` so the route and the CLI render identical data without duplicating tool-introspection logic.

Several silent `catch { }` blocks were tightened to log via the existing pino logger so `pnpm debug logs errors` actually surfaces them: `src/lib/ai-config/ai-config.ts`, `src/lib/ai-config/validators/task.ts`, `src/lib/tasks/task-scheduler.ts`, `src/lib/tools/board-tools.ts`.

## Consequences

- **Faster debugging.** One command surface instead of four.
- **AI-friendly.** Claude Code can be told "check `pnpm debug doctor` and `pnpm debug logs errors --days 1`" instead of re-discovering log paths every session.
- **No new runtime risk.** The CLI is read-only by default; mutating subcommands (`tasks run`, `triggers fire`) reuse the production executor path, so they exercise the same code that will run in scheduled execution.
- **Documentation surface.** `docs/debugging.md` is the canonical reference; `CLAUDE.md` links there for full detail and lists the most common one-liners inline.
