---
title: Periodic Tasks
status: done
owner: Mike
last_updated: 2026-03-22
canonical_file: docs/requirements/periodic-tasks.md
---

# Periodic Tasks

## Purpose

- Problem: There's no way to schedule recurring AI-driven tasks (e.g., daily summaries, weekly reviews, periodic data gathering) that run automatically without manual intervention.
- Outcome: Markdown files in the AI config `tasks/` folder define scheduled prompts that execute on a cron schedule, with results stored in the database and viewable in the UI.
- Notes: Follows the same config-as-markdown pattern used by system-prompt, title-prompt, and skills. Results reuse the `ChatThread` table with a discriminator type.

## Current Reality

- Current behavior: No scheduler or periodic task infrastructure exists. The `system-settings.md` requirements doc mentions a `jobs/` subfolder as a future `todo`. The AI config system supports markdown files with frontmatter + zod validation, which this feature extends.
- Constraints: SQLite + single-process Node server (TanStack Start on Vite). No background worker infrastructure. `dayjs` and `chokidar` already installed.
- Non-goals: Not a general-purpose job queue. Not for non-AI tasks (those are handled separately by system tasks — see below). Not for user-triggered one-shot workflows (that's the separate Workflows feature).

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Task file format | done | Markdown files in `tasks/` subfolder with cron, title, model, effort, enabled, optional endDate, timezone, maxTokens, notification in frontmatter; body is the prompt |
| Task system prompt | done | Configurable AI config file (`task-prompt.md`) similar to `system-prompt.md` and `title-prompt.md`, used as the system prompt for all task executions |
| Zod validator | done | Validators for task files and task-prompt following existing `ai-config-validators` pattern with real-time editor feedback |
| Scheduler runtime | done | In-process singleton scheduler (same pattern as `vault-index.ts`) with chokidar file watching on `tasks/` for dynamic add/remove/update |
| Task execution | done | Execute task prompt via `generateText` with full tool access and multi-turn agent loop (via `stepCountIs(10)`) |
| Database — Task table | done | `Task` table tracking each task file's metadata, last run time, last status — persists across restarts and file deletions |
| Database — ChatThread type | done | Store task runs in `ChatThread` table with a `type` discriminator column (`chat` vs `task`) |
| Usage tracking | done | Track token usage per task run via `ChatUsageEvent` with `taskType: "task"` |
| Activity logging | done | Log task executions as `ActivityLog` entries with type `cron_task` |
| UI — Task list | done | Page at `/tasks` showing all configured tasks, their cron schedule, next run time, enabled/disabled status |
| UI — Run history | done | View past runs for a task with prompt, response, usage, and timestamp |
| Seed/pull CLI | done | `ai-config:seed` and `ai-config:pull` scripts recursively handle `tasks/` folder and `task-prompt.md` via generic directory copy |
| Env kill switch | done | `DISABLE_CRON=true` env var to globally disable the scheduler |
| Notifications | done | Per-task `notification` field (`silent`, `notify`, `push`) controls whether task completion/failure sends notifications |
| System tasks | done | Code-defined non-AI cron tasks (cleanup, calendar sync) run alongside user-defined AI tasks via `system-tasks.ts` |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Task file format & validation | done | Frontmatter schema + zod validator for `tasks/*.md` | Inline |
| Task system prompt config | done | `task-prompt.md` AI config file for task system prompt | Inline |
| Scheduler engine | done | Singleton with chokidar watcher, cron scheduling, eager init on import | Inline |
| Task execution pipeline | done | Prompt → `generateText` with `stepCountIs(10)` → store result | Inline |
| Schema migration | done | New `Task` table + `type` column on `ChatThread`, filter existing queries | Inline |
| Task management UI | done | List view + run history viewer at `/tasks` | Inline |
| CLI tooling | done | Seed examples, pull config | Inline |
| System tasks | done | Code-defined cleanup and sync cron jobs | Inline |
| Notifications | done | Per-task notification level with push support | Inline |

## Detail

### Task file format & validation

**File location:** `{obsidianConfigPath}/tasks/*.md`

**Frontmatter schema:**

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `title` | string | yes | — | Human-readable task name |
| `cron` | string | yes | — | Cron expression (5-field standard: `min hour dom mon dow`) |
| `model` | string | no | `claude-haiku-4-5` | Model ID override |
| `effort` | string | no | `low` | Effort level override |
| `enabled` | boolean | no | `true` | Set `false` to pause without deleting the file |
| `endDate` | string | no | — | ISO 8601 or dayjs-parseable date after which the task stops running |
| `maxTokens` | number | no | — | Per-run output token ceiling to prevent runaway costs |
| `timezone` | string | no | server timezone | IANA timezone (e.g. `America/Toronto`). Controls when the cron schedule fires. |
| `notification` | string | no | `notify` | One of `silent`, `notify`, `push`. Controls whether completion/failure sends a notification and whether it pushes to phone. |

**Body:** The markdown body is the prompt sent to Claude. Supports the same `{{placeholder}}` substitution as system-prompt (e.g., `{{date}}`, `{{userName}}`, `{{aiMemoryPath}}`).

**Validator:** `src/lib/ai-config-validators/task.ts` exporting the standard validator shape. Validates:
- `cron` is a valid expression (validated by creating a paused `Cron` instance)
- `title` is non-empty
- `model` (if present) is a known model ID from `chat-models.ts`
- `effort` (if present) is one of `low`, `medium`, `high`
- `endDate` (if present) parses as a valid date
- `enabled` (if present) is boolean
- `maxTokens` (if present) is a positive integer
- `timezone` (if present) is a valid IANA timezone (validated via `Intl.DateTimeFormat`)
- `notification` (if present) is one of `silent`, `notify`, `push`
- Body is non-empty

**Example file:** `examples/ai-config/tasks/daily-summary.md`

### Task system prompt config

**File:** `{obsidianConfigPath}/task-prompt.md` — a new AI config file type, similar to `system-prompt.md` and `title-prompt.md`.

**Purpose:** Defines the system prompt used for all periodic task executions. Separate from the chat system prompt because tasks have different context (no conversation history, running autonomously, may need different instructions about tool use and output format).

**Frontmatter schema:**

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `model` | string | no | — | Default model for tasks (overridden by per-task `model`) |
| `effort` | string | no | — | Default effort for tasks (overridden by per-task `effort`) |

**Body:** The system prompt template. Supports `{{placeholder}}` substitution (`{{date}}`, `{{userName}}`, etc.). Should instruct the AI that it's running as an autonomous background task, not in a conversation.

**Validator:** `src/lib/ai-config-validators/task-prompt.ts`. Validates body is non-empty, model/effort valid if present.

**Fallback:** If `task-prompt.md` doesn't exist or is invalid, use a hardcoded default system prompt (same pattern as other config files).

**Example file:** `examples/ai-config/task-prompt.md`

### Task execution

The task executor (`src/lib/task-executor.ts`) uses Vercel AI SDK's `generateText` directly with full tool access and multi-turn capabilities via `stopWhen: stepCountIs(10)`. This is separate from the chat API route which uses `streamText` for SSE streaming. No shared "chat harness" module was extracted — the two paths remain independent.

**Key differences between chat and task execution:**

| Concern | Chat | Task |
| --- | --- | --- |
| System prompt source | `system-prompt.md` | `task-prompt.md` |
| Response delivery | Stream to client via SSE (`streamText`) | Run to completion server-side (`generateText`) |
| Conversation history | Multi-turn with prior messages | Single user message (the task prompt) |
| Token limit | None (user-controlled) | Optional `maxTokens` from config |
| Thread type | `type: "chat"` | `type: "task"` |
| Agent loop | `stepCountIs(10)` via `streamText` | `stepCountIs(10)` via `generateText` |

### Scheduler engine

**Architecture:** Explicitly started singleton runtime. `src/start.ts` uses TanStack Start request middleware to call `ensureAppRuntimeStarted()` in `src/lib/app-runtime.ts`, which boots the scheduler and workflow watcher idempotently. The scheduler still uses chokidar + croner internally, but importing helper modules no longer starts background processes.

**Module:** `src/lib/task-scheduler.ts`

**Cron library: `croner`** — ESM-native, works in Node >=18, Deno, Bun, and browsers. Includes TypeScript typings. OCPS 1.0-1.4 compliant pattern syntax (supports seconds field, `L`, `W`, `#` modifiers — we use standard 5-field `min hour dom mon dow`).

**Key `croner` API mapping:**

| Our need | Croner API |
| --- | --- |
| Create a job | `const job = new Cron(pattern, options, callback)` |
| Stop a job permanently | `job.stop()` — removes from `scheduledJobs` array |
| Pause/resume | `job.pause()` / `job.resume()` |
| Get next run | `job.nextRun()` → `Date \| null` |
| Get multiple next runs | `job.nextRuns(n)` → `Date[]` |
| Check if executing now | `job.isBusy()` → `boolean` |
| Check if still scheduled | `job.isRunning()` → `boolean` |
| Trigger immediately | `job.trigger()` |
| Named job lookup | Set `name` in options → job stored in exported `scheduledJobs` array; `stop()` auto-removes |
| Overrun protection | `protect: true` or `protect: (job) => {}` — blocks new triggers while previous run in progress |
| Error handling | `catch: true` (silent) or `catch: (err, job) => {}` — errors don't kill the job |
| Timezone | `timezone: "America/Toronto"` option |
| Stop after date | `stopAt: "2026-12-31T00:00:00"` option (ISO 8601) — maps directly to our `endDate` |
| Start paused | `paused: true` option — maps to our `enabled: false` |
| Prevent process hang | `unref: true` — unrefs internal timer so Node can exit cleanly |

**How dynamic add/remove works:**
- Each `Cron` instance is independent — no central registry to manage
- Create a new `Cron()` to add a job; call `job.stop()` to permanently remove it
- Our `Map<filename, ScheduledTask>` handles the mapping; on file change: `map.get(filename)?.job?.stop()`, then re-create
- Named jobs (via `name` option) are also accessible via the exported `scheduledJobs` array; existing jobs with the same name are stopped before creating new ones to avoid "name already taken" errors

**Options we use per job:**

```typescript
new Cron(config.cron, {
  name: config.title,
  timezone: config.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  protect: true,          // built-in overrun protection — skip if previous run busy
  catch: (err) => { /* log error */ },
  unref: true,            // don't prevent process exit
  ...(config.endDate ? { stopAt: config.endDate } : {}),
  ...(startAt ? { startAt } : {}), // restart guard delay
}, () => executeTask(filename, config))
```

**Key simplifications from croner's built-in features:**
- `protect: true` replaces manual concurrency lock — croner skips the trigger if `isBusy()`
- `stopAt` replaces manual `endDate` check at trigger time — croner handles it natively
- `paused` replaces manual `enabled` check — disabled tasks are created paused (with no callback, so `nextRun` is still available)
- `catch` handler replaces manual try/catch — keeps the job alive after errors

**Env kill switch:** If `DISABLE_CRON=true` is set, the scheduler syncs task DB rows (so UI still works) but does not create cron jobs or start the file watcher. System tasks also do not start.

**Lifecycle:**
1. `src/start.ts` request middleware calls `ensureAppRuntimeStarted()` on the server; bootstrap is idempotent per process.
2. `src/lib/app-runtime.ts` starts the workflow watcher and task scheduler explicitly, and owns process/HMR cleanup.
3. Scheduler ensures the `tasks/` directory exists (creates it with `recursive: true`)
4. Check `DISABLE_CRON` env var — if truthy, sync task DB only (upsert rows, mark deleted files), skip cron jobs and watcher
5. Read and validate all `tasks/*.md` files from the AI config path
6. Find first admin user for DB operations; bail if none exists
7. Get existing `Task` rows for restart guard comparison
8. Upsert `Task` rows in the database with current frontmatter values; mark any `Task` rows whose files no longer exist as `fileExists: false`
9. **Restart guard:** For each task, compare `lastRunAt` from DB against the cron schedule. If the next scheduled run after `lastRunAt` is in the past but within grace window (<60s ago), set `startAt` to the following run to avoid double-running after a quick restart.
10. Register valid tasks as `Cron` instances, stored in a `Map<filename, ScheduledTask>`
11. Start chokidar watcher on `{obsidianConfigPath}/tasks/` directory (ignoring non-`.md` files)
12. On file add/change: stop existing job, re-parse, validate, upsert `Task` row (set `fileExists: true`), create new `Cron`, update Map
13. On file delete: stop job, delete from Map, set `Task.fileExists = false` in DB (do NOT delete the row)
14. Start system tasks via `startSystemTasks()`
15. On process shutdown (`SIGTERM`/`SIGINT`) or Vite HMR disposal: `src/lib/app-runtime.ts` stops all jobs, closes watchers, and clears runtime state

**Exposed API:**
- `initScheduler(): Promise<void>` — idempotent, safe to call multiple times
- `getScheduledTasks(): ScheduledTaskInfo[]` — for UI: reads Map, calls `job.nextRun()`, `job.isRunning()`, `job.isBusy()` per job
- `triggerTask(filename: string): Promise<void>` — directly calls `executeTask()` for manual "run now"
- `closeScheduler(): Promise<void>` — stops all jobs (including system tasks), closes watcher, clears state

**Key rules:**
- Missed runs (server was down): do NOT retroactively execute. Resume from next scheduled time (croner's default behavior).
- Concurrency: Handled by `protect: true` — croner skips trigger if previous run still in progress.
- Timezone: Per-task via `timezone` field, falling back to server's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- `endDate`: Handled by croner's `stopAt` option natively.
- `enabled`: Disabled tasks create a paused `Cron` with no callback (so `nextRun()` is still available for UI) rather than being fully skipped.
- Active in both dev and prod. Dev uses a test vault so this is safe.

### System tasks

**Module:** `src/lib/system-tasks.ts`

Non-AI cron tasks defined in code (not markdown files) that run alongside the user-defined AI tasks. Started by the scheduler after all user tasks are registered; stopped during shutdown.

**Current system tasks:**

| Name | Cron | Description |
| --- | --- | --- |
| `cleanup-stale-records` | `0 * * * *` (hourly) | Deletes `Task` and `Workflow` rows where `fileExists: false` and `lastRunAt` is null |
| `cleanup-old-notifications` | `0 3 * * *` (daily 3 AM) | Deletes read notifications older than 30 days |
| `calendar-sync` | `* * * * *` (every minute) | Triggers calendar feed sync (checks per-feed intervals internally) |

System tasks use the same croner options (`protect`, `catch`, `unref`, timezone) and are tracked in a separate `systemJobs` array. Activity is logged with type `system_task`.

### Task execution pipeline

**Flow:**
1. Croner triggers callback (guards already handled: `protect` skips if busy, `stopAt` handles endDate, `paused` handles enabled)
2. Find first admin user (tasks run as the first admin user)
3. Load task system prompt from `task-prompt.md` config via `readTaskPromptConfig()`
4. Resolve model: per-task `model` → task-prompt config `model` → default (`claude-haiku-4-5`)
5. Resolve effort: per-task `effort` → task-prompt config `effort` → default (`low`)
6. Create a new `ChatThread` record with `type: "task"`, `sourceTaskFile: filename`, title from config, model and effort
7. Substitute placeholders in task body (`{{date}}`, `{{userName}}`, `{{aiMemoryPath}}`)
8. Create AI tools via `createAiTools()` with admin user context
9. Call `generateText` with the task prompt, system prompt, tools, and `stopWhen: stepCountIs(10)` for multi-turn agent loop
10. On completion: serialize all response messages into `messagesJson`, calculate usage and cost, update thread, create `ChatUsageEvent` with `taskType: "task"`, create `ActivityLog` entry with type `cron_task`, update `Task` row with `lastRunAt`, `lastRunStatus: "success"`, `lastThreadId` — all in a single transaction
11. Send notification based on `notification` level (skip if `silent`, push to phone if `push`)
12. On error: store error message in the thread, log activity with `success: false`, update `Task` row with `lastRunStatus: "error"`, send failure notification (always pushes to phone on error unless `silent`)

### Schema migration

**New `Task` model:**

```prisma
model Task {
  id             String    @id @default(cuid())
  filename       String    @unique          // e.g. "daily-summary.md"
  title          String                     // from frontmatter at last sync
  cron           String                     // cron expression at last sync
  model          String    @default("claude-haiku-4-5")
  effort         String    @default("low")
  enabled        Boolean   @default(true)
  endDate        DateTime?
  maxTokens      Int?
  timezone       String?                    // IANA timezone override
  lastRunAt      DateTime?                  // when the last execution started
  lastRunStatus  String?                    // "success" | "error"
  lastThreadId   String?                    // FK to the ChatThread of the last run
  fileExists     Boolean   @default(true)   // false when file deleted but record kept
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  userId         String
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, filename])
}
```

**Purpose:**
- **Restart guard:** On scheduler init, compare `lastRunAt` against the task's cron schedule. If the next run after `lastRunAt` is in the past but within a short window (<60s ago), skip it to prevent double-runs after a quick restart.
- **Durable history:** When a task file is deleted, set `fileExists: false` instead of deleting the row. The task still appears in the UI (greyed out) with its run history intact. Stale records (deleted files with no runs) are periodically cleaned up by the `cleanup-stale-records` system task.
- **UI data source:** The task list page queries this table (joined with live scheduler state for next run time) rather than relying solely on in-memory state. This means the list is available even when `DISABLE_CRON=true`.

**Sync behavior:**
- On scheduler init and on file add/change: upsert `Task` row with current frontmatter values (including `timezone`)
- On file delete: set `fileExists: false`, stop the cron job
- After each run: update `lastRunAt`, `lastRunStatus`, `lastThreadId`

**`ChatThread` changes:**
- Add column `type String @default("chat")` — values: `chat`, `task`
- Add column `sourceTaskFile String?` — the filename of the task that created this thread (for grouping runs)
- Add column `sourceWorkflowFile String?` — for the parallel Workflows feature
- Add index on `[userId, type, updatedAt]`

**Query changes:**
- All existing chat queries (`getChatPageData`, etc.) must add `WHERE type = 'chat'` filter
- New server functions for task runs: filter `WHERE type = 'task'` with optional `sourceTaskFile` filter

**`ChatUsageEvent` changes:**
- `taskType` already exists and defaults to `"chat"`. Task runs use `"task"`. No schema change needed.

### Task management UI

**Route:** `/tasks` (list view), `/tasks/$` (run history, splat route where the splat is the filename)

**List view (`src/routes/tasks/index.tsx`):**
- Data source: `Task` table (durable) joined with live scheduler state (next run time from croner). Works even when `DISABLE_CRON=true` since the table persists.
- Columns: title (linked to run history), schedule (human-readable via `cronstrue` with raw cron in tooltip), next run (relative time), last run time (relative time), last run status (success/error badge), run now button
- Row actions: click title to view run history, "Run now" button per task (hidden when file deleted)
- Visual indicators: disabled tasks and deleted files (dimmed row via `opacity-50`), deleted task files (`fileExists: false` — "File removed" badge), paused tasks ("Paused" badge), timezone displayed when set
- Banner when `DISABLE_CRON=true` explaining that the scheduler is globally disabled (allows manual trigger still)
- Empty state component (`TaskEmptyState`) when no tasks configured
- Component: `src/components/tasks/TaskTable.tsx`

**Run history view (`src/routes/tasks/$.tsx`):**
- Navigating to `/tasks/{filename}` shows past runs for that task
- Past runs are `ChatThread` records where `sourceTaskFile` matches, ordered by `createdAt` desc
- Header shows: task title, cron schedule (human-readable + raw), model badge, timezone badge (if set), file status badges
- Link to open task file in Obsidian editor
- Each run shows: timestamp, model, total tokens, estimated cost
- Expandable run detail: full response messages rendered via shared `RunMessages` component (includes tool calls/results)
- Delete button per run (deletes the `ChatThread` record)
- Component: `src/components/tasks/TaskRunHistory.tsx`

### CLI tooling

- `pnpm ai-config:seed` — recursively copies `examples/ai-config/` to the live config directory, which includes `tasks/` folder with example file(s) and `task-prompt.md`
- `pnpm ai-config:pull` — recursively copies live config `.md` files back to `examples/ai-config/`, which includes `tasks/` and `task-prompt.md`

Note: There is no dedicated `tasks:run` CLI script. Manual triggering is done via the "Run now" button in the UI, which calls `triggerTask()` on the server.

## Open Questions

None — all questions resolved.

## Implementation Plan

Suggested build order:

1. **Schema migration** — New `Task` model, add `type` and `sourceTaskFile` to `ChatThread`, update existing chat queries to filter `WHERE type = 'chat'`
2. **Task file format + validator** — Zod schema, validator registration, example files in `examples/ai-config/tasks/`
3. **Task system prompt** — `task-prompt.md` config file, validator, example, config reader with fallback
4. **Scheduler engine** — Install cron library, build singleton scheduler with chokidar watcher (mirror `vault-index.ts` pattern), `DISABLE_CRON` env check
5. **Execution pipeline** — Wire scheduler triggers to `generateText` with `stepCountIs(10)`, store results, track usage, log activity
6. **UI — Task list** — Route, server functions, list component with cron display, status, and `DISABLE_CRON` banner
7. **UI — Run history** — Run detail view with rendered markdown responses via shared `RunMessages` component
8. **CLI updates** — Seed/pull scripts already handle tasks via recursive directory copy
9. **System tasks** — Code-defined cleanup and sync cron jobs in `system-tasks.ts`
10. **Notifications** — Per-task notification level with push support

## Change Log

- 2026-03-16: Initial requirements draft
- 2026-03-16: Resolved open questions — full tool access, multi-turn agent loop, `/tasks` route, `enabled` flag, `maxTokens` guard, chat harness abstraction, scheduler runs in dev, runs kept forever, endDate silently skips
- 2026-03-16: Added task-prompt.md config, DISABLE_CRON env var, chokidar file watching (same pattern as vault-index.ts), scheduler singleton with eager init on import
- 2026-03-16: Verified croner API — confirmed fit. Documented full API mapping, options config, and key simplifications (protect, stopAt, paused replace manual guards)
- 2026-03-16: Added `Task` DB table for durable job tracking — restart guard via `lastRunAt`, `fileExists` flag for deleted files, UI data source independent of scheduler state
- 2026-03-22: Updated to reflect implementation. Key changes: added `timezone` and `notification` frontmatter fields; no shared `ai-executor.ts` was created (task executor uses `generateText` directly, chat uses `streamText`); agent loop uses `stepCountIs(10)` instead of manual loop; no `tasks:run` CLI script (manual runs via UI only); added system tasks section (`cleanup-stale-records`, `cleanup-old-notifications`, `calendar-sync`); disabled tasks create paused Cron with no callback; run history uses splat route `/tasks/$`; `sourceWorkflowFile` added to ChatThread for parallel Workflows feature; stale record cleanup handled by system task
