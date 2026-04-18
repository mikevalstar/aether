---
title: Sub-Agents
status: in-progress
owner: self
last_updated: 2026-04-18
canonical_file: docs/requirements/sub-agents.md
---

# Sub-Agents

## Purpose

- Problem: Long research or multi-step investigations bloat the parent chat's context window with tool calls and intermediate output the user doesn't need to see. There's no way to delegate a focused subtask to a side conversation whose final result — not its full transcript — comes back to the parent.
- Outcome: Markdown-defined sub-agents live in `ai-config/sub-agents/` and can be fired in parallel via a `spawn_sub_agents` tool. Each sub-agent runs its own chat turn (with inherited tools, model, and effort), and only its final assistant message is returned to the parent. Sub-agent threads are persisted and linked to the parent so they can be audited, displayed inline, and costed separately.
- Related: [Chat](chat.md), [AI Skills](skills.md), [System Settings](system-settings.md), [Usage](usage.md), [Periodic Tasks](periodic-tasks.md), [Workflows](workflows.md), [Triggers](triggers.md).

## Core Concepts

- **Sub-agents are single markdown files** — each sub-agent is one `.md` file in the `sub-agents/` folder of the AI config directory. Same format pattern as skills/tasks/workflows.
- **Parent spawns many, gets back final text only** — `spawn_sub_agents` takes an array of `{ agent, prompt }` pairs and runs them in parallel. Each sub-agent returns only its final assistant message; tool calls and intermediate reasoning stay in the sub-agent's own thread and do not pollute the parent's context.
- **Inherit everything by default** — sub-agents inherit the parent's model and effort level unless their frontmatter overrides the model. They get the same full tool set as the parent (web, Obsidian, board, calendar, memory, skills, plugin tools, @-mentions) _except_ the `spawn_sub_agents` tool itself (no recursion).
- **Own ChatThread, linked to parent** — each sub-agent run is persisted as its own `ChatThread` row with `type = "sub-agent"` and a `parentThreadId` pointer. These threads are auditable via deep links but are hidden from the chat sidebar.
- **Separate usage accounting** — sub-agent cost is tracked on its own thread and via `ChatUsageEvent` rows with `taskType = "sub-agent"`. The parent thread's totals only count its own direct usage; aggregation happens in the UI (`/chat` header tooltip) so SQL `SUM`s on `ChatUsageEvent` remain per-thread accurate for `/usage` charts.
- **Available beyond chat** — the tool is wired into chat, tasks, workflows, and triggers so any AI context can delegate.

## Sub-Agent File Format

```
ai-config/
  sub-agents/
    research.md
    ...
```

### Sub-Agent File Structure

```markdown
---
name: Researcher
description: Delegate focused web/vault research — returns a single structured report at the end
model: claude-sonnet-4-6 # optional; omit to inherit parent model
---

You are a research sub-agent spawned by another agent. You will receive a single prompt
and must return all findings in one final assistant message — only that final message is
visible to the parent agent. You cannot ask follow-up questions.

Produce a structured report with:

- A short summary
- Key findings as bullet points
- Reference links for every claim

...
```

### Frontmatter Fields

| Field         | Required | Validation                                                                                                                                                |
| ------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | yes      | Non-empty string. Human-readable display name shown in the tool description and UI.                                                                       |
| `description` | yes      | Non-empty string describing when the parent should use this sub-agent (critical for AI triggering — surfaced in the `spawn_sub_agents` tool description). |
| `model`       | no       | Optional model id from `chat-models.ts`. Omit to inherit parent's model.                                                                                  |

### Body

- Non-empty markdown — injected as the sub-agent's system prompt (in addition to the usual base system prompt pieces).
- Should explicitly tell the sub-agent that only its final assistant message returns to the parent, and that it cannot ask clarifying questions.

## Architecture

### Loading Flow

1. **Per-request**: Read all `.md` files from `sub-agents/` in the AI config directory (parallel with system prompt + skills).
2. **Validate**: Each file passes through `parseAndValidateAiConfig()` using a new `subAgentValidator` registered in `src/lib/ai-config/validators/`.
3. **Build tool**: Assemble a list of valid sub-agents (`{ name, description, filename, model?, body }`) and create a single `spawn_sub_agents` tool whose description embeds the available agents.
4. **Register**: Register `spawn_sub_agents` in the parent's tool set only when ≥1 valid sub-agent exists.

### `spawn_sub_agents` Tool

```typescript
tool({
  description:
    "Delegate one or more focused subtasks to sub-agents running in parallel. " +
    "Each sub-agent runs its own conversation and returns only its final assistant message. " +
    "Use this when you need deep research or multi-step work that would bloat the main context. " +
    "Available sub-agents:\n" +
    "- researcher: Delegate focused web/vault research — returns a single structured report\n" +
    "...",
  inputSchema: z.object({
    spawns: z
      .array(
        z.object({
          agent: z.string().describe("The sub-agent filename (e.g. research.md) or name"),
          prompt: z.string().describe("The full task prompt for the sub-agent"),
        }),
      )
      .min(1)
      .max(25),
  }),
  execute: async ({ spawns }) => {
    // Spawn all in parallel, each producing its own ChatThread + usage events.
    // Stream progress updates so the UI sees tokens live.
    // Return array of { agent, threadId, finalText, error? } — final text only.
  },
});
```

### System Prompt / Tool Description

The `spawn_sub_agents` tool description lists every valid sub-agent's filename + description so the parent AI can match intent to agent. No separate prompt section needed (unlike skills) — the tool description carries the catalog.

### Execution Model

- Each spawn runs via a reusable internal `runSubAgent({ subAgent, prompt, parentContext })` helper that wraps the same `streamText` pipeline used by `/api/chat`.
- Parent context passed through: user id, parent thread id, model + effort (unless overridden by sub-agent frontmatter), full tool set minus `spawn_sub_agents`.
- Up to 25 parallel spawns per call; enforced in the zod schema.
- Each sub-agent gets a fresh `ChatThread` (`type = "sub-agent"`, `parentThreadId` set, messages stored like a regular thread for auditing).
- Token/cost accounting: each spawn writes its own `ChatUsageEvent` rows (`taskType = "sub-agent"`, `threadId` = sub-agent thread id). Parent thread's totals and usage events are untouched.
- Streaming: the tool `execute` emits progress frames (per-spawn) so the UI can stream sub-agent deltas live; the final return value is the `{ finalText }` for each spawn.
- On error: the spawn returns `{ error: "..." }` instead of `finalText`; other spawns in the batch still return their results.

### Storage Model

Add to `ChatThread`:

```prisma
parentThreadId   String?
subAgentFilename String?   // which sub-agent config was used, for drill-down
@@index([parentThreadId])
```

- Sub-agent threads are user-owned (`userId` inherited from parent).
- Sidebar queries already filter by `type = "chat"`, so sub-agent threads are hidden automatically.
- Deletion: deleting the parent cascades to sub-agent threads (or leaves them standalone — to be decided; default: cascade via app logic, not DB constraint).

## Major Requirements

| Area                       | Status | Requirement                                                                                                                                                                                           |
| -------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sub-agent file format      | done   | `.md` with `name`, `description`, optional `model` frontmatter; body is the sub-agent system prompt.                                                                                                  |
| Sub-agents directory       | done   | `sub-agents/` under AI config directory, flat structure, one file per sub-agent.                                                                                                                      |
| Zod validator              | done   | `subAgentFrontmatterSchema` in `src/lib/ai-config/validators/sub-agent.ts` — `name` non-empty, `description` non-empty, `model` optional via shared `modelField`. Body non-empty.                     |
| Sub-agent loader           | done   | `readAllSubAgents()` in `src/lib/sub-agents.ts`. Returns validated list `{ name, description, filename, model?, body }`. Logs warnings for invalid files.                                             |
| `spawn_sub_agents` tool    | done   | `createSpawnSubAgents()` in `src/lib/tools/spawn-sub-agents.ts` with embedded catalog + parallel `Promise.all`. Registered in chat and `executor-shared` (tasks/workflows/triggers) when ≥1 exists.   |
| Parent→sub-agent isolation | done   | Sub-agents use `createAiTools()` which does not include `spawn_sub_agents` — the tool is wired in separately per runner, so sub-agents never see it. Prevents recursion without explicit filtering.  |
| Effort + model inheritance | done   | Sub-agent inherits parent effort unconditionally; inherits parent model unless frontmatter `model` overrides (resolved via `resolveModelId`).                                                         |
| Concurrent spawn cap       | done   | Zod schema enforces `.min(1).max(25)`.                                                                                                                                                                |
| Sub-agent as ChatThread    | done   | Each spawn creates a `ChatThread` with `type = "sub-agent"`, `parentThreadId`, and `subAgentFilename`. New columns + index added. Sidebar already filters on `type = "chat"` so sub-agents are hidden. |
| Usage accounting           | done   | Sub-agent runs write `ChatUsageEvent` rows with `taskType = "sub-agent"`. Parent thread totals untouched. `ChatTaskType`, `TASK_TYPES`, `getTaskTypeLabel` extended.                                  |
| Chat UI — inline display   | todo   | Phase 2.                                                                                                                                                                                              |
| Chat UI — open standalone  | todo   | Phase 2.                                                                                                                                                                                              |
| Chat UI — cost tooltip     | todo   | Phase 3.                                                                                                                                                                                              |
| `/usage` breakdown         | in-progress | `TASK_TYPES` now includes `sub-agent`; `/usage` filter UI update still pending (Phase 3).                                                                                                         |
| Example sub-agent          | done   | `examples/ai-config/sub-agents/research.md` shipped. Manually copied into the live Obsidian AI config for testing.                                                                                    |
| Config validation          | done   | `subAgentValidator` registered with directory prefix `"sub-agents/"` in `validators/index.ts`.                                                                                                        |
| Seed/pull support          | done   | Generic recursive copy in the existing scripts handles the new `sub-agents/` folder without modification.                                                                                             |
| Availability outside chat  | done   | Registered in `/api/chat` and in `executor-shared.ts` (covers tasks, workflows, triggers).                                                                                                            |
| Chat-debug visibility      | done   | `/chat-debug` page shows a "Sub-agents" section listing each configured sub-agent with filename, name, description, and model override.                                                                |

## Sub-features

| Sub-feature                  | Status | Summary                                                                                                                                                                                  | Detail |
| ---------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Sub-agent scanner            | done   | `readAllSubAgents()` reads dir, validates via shared pipeline, returns metadata + body.                                                                                                  | Inline |
| Tool factory                 | done   | `createSpawnSubAgents()` builds the tool with catalog in description + parallel execute.                                                                                                 | Inline |
| Sub-agent runner             | done   | Internal `runSubAgent()` helper wraps `generateText` (Phase 2 will upgrade to streaming) with inherited context and persists to its own thread.                                          | Inline |
| Prisma schema update         | done   | Added `parentThreadId`, `subAgentFilename`, and `@@index([parentThreadId])` to `ChatThread`. Columns applied via direct SQL since `prisma db push` is blocked by the running dev server's better-sqlite3 lock; schema file is source of truth. | Inline |
| Usage event type             | done   | Added `"sub-agent"` to `ChatTaskType`, `TASK_TYPES`, and `getTaskTypeLabel`.                                                                                                             | Inline |
| Cost aggregation helper      | todo   | Phase 3.                                                                                                                                                                                 | Inline |
| Chat header tooltip          | todo   | Phase 3.                                                                                                                                                                                 | Inline |
| Inline sub-agent block       | todo   | Phase 2.                                                                                                                                                                                 | Inline |
| Standalone sub-agent view    | todo   | Phase 2.                                                                                                                                                                                 | Inline |
| `/usage` filter update       | todo   | Phase 3.                                                                                                                                                                                 | Inline |
| Example: research sub-agent  | done   | `examples/ai-config/sub-agents/research.md` plus copy into live Obsidian AI config.                                                                                                      | Inline |
| Zod validator                | done   | `src/lib/ai-config/validators/sub-agent.ts` uses shared `modelField` for model validation.                                                                                               | Inline |
| Seed/pull integration        | done   | Generic recursive copy handles the new subfolder — no script changes needed.                                                                                                             | Inline |
| Task/workflow/trigger wiring | done   | Wired in `executor-shared.ts` so all three runners pick it up when sub-agents exist.                                                                                                     | Inline |
| Chat-debug surfacing         | done   | `/chat-debug` page lists configured sub-agents with filename, name, description, model override.                                                                                         | Inline |

## Detail

### Phase 1 — Sub-Agent Tool + Example

- **Goal**: Ship the `spawn_sub_agents` tool end-to-end with the research example, visible in chat-debug, callable from chat/tasks/workflows/triggers.
- **Deliverables**:
  - Prisma migration adding `parentThreadId` + `subAgentFilename` to `ChatThread`.
  - `src/lib/sub-agents.ts` — loader (`readAllSubAgents`), runner (`runSubAgent`).
  - `src/lib/tools/spawn-sub-agents.ts` — tool factory.
  - `src/lib/ai-config/validators/sub-agent.ts` — zod validator + registration.
  - `examples/ai-config/sub-agents/research.md` — researcher example prompt.
  - Wiring in `src/routes/api/chat.ts` and task/workflow/trigger runners.
  - Docs + `chat-debug` page exposes configured sub-agents.
- **Exit criteria**: A chat turn can call `spawn_sub_agents` with 1–25 research prompts in parallel; each spawn produces its own `ChatThread` with `parentThreadId` set and `ChatUsageEvent` rows with `taskType = "sub-agent"`; parent receives only final text per spawn.

### Phase 2 — UI for Sub-Agent Work

- **Goal**: Make sub-agent activity visible inline in the chat transcript, streamed live.
- **Deliverables**:
  - New transcript component rendering each `spawn_sub_agents` call as a collapsible group with a card per spawn: sub-agent name, model used, streaming text deltas, final result, token/cost footer, and a "open thread" link.
  - Streaming protocol: sub-agent tool `execute` emits progress updates that the UI consumes to show live tokens (similar pattern to tool-activity-summary).
  - Standalone sub-agent thread view reachable by URL but not listed in sidebar (sidebar query keeps filtering by `type = "chat"`).
  - "Return to parent" breadcrumb/link on the standalone view.
- **Exit criteria**: Firing a sub-agent in chat shows live streaming output, final report, and cost footer inline; user can open the sub-agent thread in its own view and click back to the parent.

### Phase 3 — Cost Calculations

- **Goal**: Preserve per-thread SQL accuracy while surfacing total cost that includes sub-agents in chat, and adding a per-model breakdown everywhere the total is shown.
- **Deliverables**:
  - Aggregation helper that walks parent → sub-agent threads and sums tokens/cost, grouped by model.
  - Chat header: total displays `parent + sub-agents` combined; tooltip shows per-model breakdown (e.g. `Sonnet: 5,312 in / 942 out · $0.08` / `Haiku: 1,204 in / 311 out · $0.002`).
  - `/usage` charts already stacked by model — verify `sub-agent` task type renders correctly; add filter option for task types including the new `sub-agent` value.
  - Parent `ChatThread.total*` columns stay per-thread (no rollup writes) so `SUM` queries stay correct.
- **Exit criteria**: Chat header shows aggregate cost with per-model tooltip; `/usage` can isolate sub-agent spend; no double-counting anywhere; SQL sums on `ChatUsageEvent` remain authoritative for analytics.

### Example: Research Sub-Agent

Location: `examples/ai-config/sub-agents/research.md`

```markdown
---
name: Researcher
description: Delegate focused web + vault research. Use for questions that require multi-step lookups, comparisons, or synthesis where only the final structured report matters.
---

You are a research sub-agent spawned by another agent. You have access to web search,
web fetch, and Obsidian vault tools.

## Constraints

- You will receive a single prompt and must complete the task without asking follow-up questions.
- Only your final assistant message is returned to the parent agent — everything else
  (tool calls, intermediate text) stays in your own thread and is not seen by the parent.
- Do the full investigation in one pass. Do not defer decisions back to the parent.

## Output Format

Return one final message with this structure:

### Summary

One or two sentences answering the prompt directly.

### Findings

- Key fact 1 — supporting detail. [source](https://...)
- Key fact 2 — supporting detail. [source](https://...)

### References

Numbered list of every URL used, with a short note per source.

Every factual claim must have a reference link.
```

## Post-MVP

- **Per-sub-agent tool filtering** — allow a sub-agent's frontmatter to declare an allowed/denied tool list (e.g. research-only, no destructive Obsidian writes). Today all sub-agents get the parent's full tool set for simplicity.
- **Per-sub-agent effort override** — today sub-agents always inherit parent effort; a frontmatter `effort` override may be useful.
- **Sub-agent chaining via prompt** — sub-agents can compose other sub-agents if we decide to allow one level of nesting.
- **Cost caps** — per-spawn or per-call max token / max cost guard.
- **Concurrency tuning** — revisit the 25-parallel cap with real usage data.
- **Sub-agent sidebar section** — optional collapsed list of recent sub-agent threads grouped under their parent, if auditing becomes common.
- **Task example** — an automation that reads the user's followed-bands Obsidian note, spawns a researcher per band to check Toronto tour dates, and writes an upcoming-shows document.

## Implementation Plan

| Step                            | Phase | Plan                                                                                                                                         |
| ------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Prisma schema                | 1     | Add `parentThreadId`, `subAgentFilename`, and index to `ChatThread`. Generate + migrate.                                                     |
| 2. Validator                    | 1     | `src/lib/ai-config/validators/sub-agent.ts`; register with `sub-agents/` prefix.                                                             |
| 3. Loader                       | 1     | `src/lib/sub-agents.ts` — `readAllSubAgents()` using shared validation pipeline.                                                             |
| 4. Runner                       | 1     | `runSubAgent()` helper wrapping `streamText` with inherited context + new thread.                                                            |
| 5. Tool factory                 | 1     | `src/lib/tools/spawn-sub-agents.ts` — `createSpawnSubAgents(subAgents, ctx)`; enforce 1–25 cap; parallel `Promise.all`.                      |
| 6. Context plumbing             | 1     | Extend `createAiTools()` (or equivalent) to accept parent context and exclude `spawn_sub_agents` when building the sub-agent's own tool set. |
| 7. Chat API wiring              | 1     | Register `spawn_sub_agents` in `/api/chat` when sub-agents exist.                                                                            |
| 8. Task/workflow/trigger wiring | 1     | Same registration in their runners.                                                                                                          |
| 9. Example sub-agent            | 1     | `examples/ai-config/sub-agents/research.md`.                                                                                                 |
| 10. Usage type                  | 1     | Add `"sub-agent"` to `taskType` union/constants in `src/lib/chat-usage.ts`.                                                                  |
| 11. Inline UI block             | 2     | New transcript component + streaming protocol.                                                                                               |
| 12. Standalone view             | 2     | Reuse chat route for sub-agent threads; hide from sidebar; add parent breadcrumb.                                                            |
| 13. Cost aggregation            | 3     | Helper to roll up parent + sub-agent totals grouped by model.                                                                                |
| 14. Header tooltip              | 3     | Per-model breakdown tooltip on chat header cost total.                                                                                       |
| 15. `/usage` filter             | 3     | Add sub-agent option to task-type filter.                                                                                                    |
| 16. `chat-debug`                | 1     | Surface configured sub-agents in the debug page alongside tools/skills.                                                                      |

## Open Questions

- Should deleting a parent chat thread cascade-delete its sub-agent threads automatically, or orphan them for auditing?
- Should the `spawn_sub_agents` tool description embed the sub-agent catalog inline, or also inject a `## Sub-Agents` section into the system prompt (similar to Skills)? Tool description alone may be sufficient.
- When a sub-agent run errors mid-stream, should the parent tool result report a partial `finalText` alongside the error, or just the error?
- Should sub-agent cost appear in the `/dashboard` usage widget by default, or only when the user explicitly filters to include sub-agents?
- Do we want a "last sub-agent run" indicator on the parent thread (like tasks show `lastRunStatus`)?

## Change Log

- 2026-04-18: Phase 1 implementation landed. Added `parentThreadId` + `subAgentFilename` to `ChatThread`; new `sub-agents/` config directory with zod validator; `readAllSubAgents()` loader; `spawn_sub_agents` tool wired into chat, tasks, workflows, and triggers; `ChatTaskType` + `TASK_TYPES` extended with `"sub-agent"`; `/chat-debug` now lists sub-agents; researcher example shipped and copied into live Obsidian AI config. Phase 2 (UI) and Phase 3 (cost aggregation) still pending.
- 2026-04-18: Created initial requirements for sub-agents. Three-phase plan: (1) tool + research example, (2) UI inline streaming + standalone view, (3) cost aggregation with per-model breakdown and new `sub-agent` usage task type.
