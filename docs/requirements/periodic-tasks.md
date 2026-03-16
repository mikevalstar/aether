---
title: Periodic Tasks
status: todo
owner: Mike
last_updated: 2026-03-16
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
- Non-goals: Not a general-purpose job queue. Not for non-AI tasks. Not for user-triggered one-shot workflows (that's the separate Workflows idea).

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Task file format | todo | Markdown files in `tasks/` subfolder with cron, title, model, effort, enabled, optional endDate in frontmatter; body is the prompt |
| Task system prompt | todo | Configurable AI config file (`task-prompt.md`) similar to `system-prompt.md` and `title-prompt.md`, used as the system prompt for all task executions |
| Zod validator | todo | Validators for task files and task-prompt following existing `ai-config-validators` pattern with real-time editor feedback |
| Scheduler runtime | todo | In-process singleton scheduler (same pattern as `vault-index.ts`) with chokidar file watching on `tasks/` for dynamic add/remove/update |
| Task execution | todo | Execute task prompt via shared chat harness (abstracted from chat API) with full tool access and multi-turn agent loop |
| Database — Task table | todo | `Task` table tracking each task file's metadata, last run time, last status — persists across restarts and file deletions |
| Database — ChatThread type | todo | Store task runs in `ChatThread` table with a `type` discriminator column (`chat` vs `task`) |
| Usage tracking | todo | Track token usage per task run via `ChatUsageEvent` with `taskType: "task"` |
| Activity logging | todo | Log task executions as `ActivityLog` entries with type `cron_task` |
| UI — Task list | todo | Page at `/tasks` showing all configured tasks, their cron schedule, next run time, enabled/disabled status |
| UI — Run history | todo | View past runs for a task with prompt, response, usage, and timestamp |
| Seed/pull CLI | todo | Extend `ai-config:seed` and `ai-config:pull` to include example task files and task-prompt |
| Env kill switch | todo | `DISABLE_CRON=true` env var to globally disable the scheduler |
| Chat harness abstraction | todo | Extract shared execution logic from chat API into a reusable module for both chat and task execution |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Task file format & validation | todo | Frontmatter schema + zod validator for `tasks/*.md` | Inline |
| Task system prompt config | todo | `task-prompt.md` AI config file for task system prompt | Inline |
| Chat harness abstraction | todo | Extract shared AI execution pipeline from chat API route | Inline |
| Scheduler engine | todo | Singleton with chokidar watcher, cron scheduling, eager init on import | Inline |
| Task execution pipeline | todo | Prompt → agent loop (tools + multi-turn) → store result | Inline |
| Schema migration | todo | New `Task` table + `type` column on `ChatThread`, filter existing queries | Inline |
| Task management UI | todo | List view + run history viewer at `/tasks` | Inline |
| CLI tooling | todo | Seed examples, pull config, manual trigger | Inline |

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

**Body:** The markdown body is the prompt sent to Claude. Supports the same `{{placeholder}}` substitution as system-prompt (e.g., `{{date}}`, `{{userName}}`).

**Validator:** New file `src/lib/ai-config-validators/task.ts` exporting the standard validator shape. Validates:
- `cron` is a valid 5-field expression
- `title` is non-empty
- `model` (if present) is a known model ID from `chat-models.ts`
- `effort` (if present) is valid for the chosen model
- `endDate` (if present) parses via dayjs
- `enabled` (if present) is boolean
- `maxTokens` (if present) is a positive integer
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

**Validator:** New file `src/lib/ai-config-validators/task-prompt.ts`. Validates body is non-empty, model/effort valid if present.

**Fallback:** If `task-prompt.md` doesn't exist or is invalid, use a hardcoded default system prompt (same pattern as other config files).

**Example file:** `examples/ai-config/task-prompt.md`

### Chat harness abstraction

The current chat API route (`src/routes/api/chat.ts`) contains the AI execution logic inline: system prompt building, tool registration, Claude API call, usage tracking, activity logging. This needs to be extracted into a shared module so both the chat endpoint and the task executor can use the same pipeline.

**New module:** `src/lib/ai-executor.ts` (or similar)

**Shared concerns:**
- Tool registration (web_fetch, web_search, obsidian_*, fetch_url_markdown)
- Claude API call with multi-turn agent loop (tool calls → tool results → continue)
- Usage calculation and `ChatUsageEvent` creation
- Activity logging
- Message serialization into `ChatThread.messagesJson`

**Differences between chat and task execution:**

| Concern | Chat | Task |
| --- | --- | --- |
| System prompt source | `system-prompt.md` | `task-prompt.md` |
| Response delivery | Stream to client via SSE | Run to completion server-side |
| Conversation history | Multi-turn with prior messages | Single user message (the task prompt) |
| Token limit | None (user-controlled) | Optional `maxTokens` from config |
| Thread type | `type: "chat"` | `type: "task"` |

### Scheduler engine

**Architecture:** Singleton module following the same pattern as `src/lib/obsidian/vault-index.ts` — eager init on import, chokidar file watching, HMR cleanup, process shutdown handling.

**Module:** `src/lib/task-scheduler.ts`

**Cron library: `croner`** — confirmed as the right fit. ESM-native, works in Node >=18, Deno, Bun, and browsers. Includes TypeScript typings. OCPS 1.0-1.4 compliant pattern syntax (supports seconds field, `L`, `W`, `#` modifiers — we'll use standard 5-field `min hour dom mon dow`).

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
- Our `Map<filename, Cron>` handles the mapping; on file change: `map.get(filename)?.stop()`, then `map.set(filename, new Cron(...))`
- Named jobs (via `name` option) are also accessible via the exported `scheduledJobs` array, but our own Map is simpler

**Options we'll use per job:**

```typescript
new Cron(config.cron, {
  name: config.title,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // server local
  protect: true,          // built-in overrun protection — skip if previous run busy
  catch: (err, job) => { /* log error, store in thread */ },
  paused: !config.enabled,
  stopAt: config.endDate, // croner handles this natively — no manual check needed
  unref: true,            // don't prevent process exit
}, () => executeTask(filename))
```

**Key simplifications from croner's built-in features:**
- `protect: true` replaces our manual concurrency lock — croner skips the trigger if `isBusy()`
- `stopAt` replaces our manual `endDate` check at trigger time — croner handles it natively
- `paused` replaces our manual `enabled` check — disabled tasks are created paused
- `catch` handler replaces manual try/catch — keeps the job alive after errors

**Env kill switch:** If `DISABLE_CRON=true` is set, the scheduler does not start and `initScheduler()` is a no-op. This allows disabling crons globally without removing task files.

**Lifecycle:**
1. On module import, check `DISABLE_CRON` env var — if truthy, skip init entirely (but still upsert Task rows for UI access)
2. Read all `tasks/*.md` files from the AI config path, parse and validate
3. Upsert `Task` rows in the database with current frontmatter values; mark any `Task` rows whose files no longer exist as `fileExists: false`
4. **Restart guard:** For each task, compare `lastRunAt` from DB against the cron schedule. If the next scheduled run after `lastRunAt` is within a grace window (e.g., <60s ago), delay the first trigger to avoid double-running after a quick server restart.
5. Register valid tasks as `Cron` instances, stored in a `Map<filename, Cron>`
6. Start chokidar watcher on `{obsidianConfigPath}/tasks/` directory
7. On file add: parse, validate, upsert `Task` row (set `fileExists: true`), create new `Cron` instance, add to Map
8. On file change: `map.get(filename)?.stop()`, re-parse, validate, upsert `Task` row, create new `Cron`, update Map
9. On file delete: `map.get(filename)?.stop()`, delete from Map, set `Task.fileExists = false` in DB (do NOT delete the row)
10. On process shutdown (`SIGTERM`/`SIGINT`): iterate Map, `stop()` all jobs, close chokidar watcher
11. On Vite HMR (`import.meta.hot.dispose`): same cleanup (prevents stacking during dev)

**Exposed API:**
- `initScheduler(): Promise<void>` — idempotent, safe to call multiple times
- `getScheduledTasks(): TaskInfo[]` — for UI: reads Map, calls `job.nextRun()`, `job.isRunning()`, `job.isBusy()` per job
- `triggerTask(filename: string): Promise<void>` — calls `job.trigger()` for manual "run now"
- `closeScheduler(): Promise<void>` — stops all jobs, closes watcher

**Key rules:**
- Missed runs (server was down): do NOT retroactively execute. Resume from next scheduled time (croner's default behavior).
- Concurrency: Handled by `protect: true` — croner skips trigger if previous run still in progress.
- Timezone: Server's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- `endDate`: Handled by croner's `stopAt` option natively.
- `enabled`: Handled by croner's `paused` option; toggled via `stop()` + re-create on file change.
- Active in both dev and prod. Dev uses a test vault so this is safe.

### Task execution pipeline

**Flow:**
1. Croner triggers callback (guards already handled: `protect` skips if busy, `stopAt` handles endDate, `paused` handles enabled)
2. Create a new `ChatThread` record with `type: "task"`, `sourceTaskFile: filename`, title from config, model from config
3. Load task system prompt from `task-prompt.md` config, substitute placeholders
4. Substitute placeholders in task body (the user prompt)
5. Enter agent loop via shared harness:
   - Send user message (the task prompt) to Claude with full tool access
   - If Claude responds with tool calls, execute them and send results back
   - Continue until Claude produces a final text response (or hits `maxTokens`)
6. On completion: serialize all messages (including tool calls/results) into `messagesJson`, update usage fields on the thread
7. Create `ChatUsageEvent` with `taskType: "task"` and link to thread
8. Create `ActivityLog` entry with `type: "cron_task"` and metadata `{ taskFile, chatThreadId, model, inputTokens, outputTokens, estimatedCostUsd, success: true }`
9. Update `Task` row: set `lastRunAt`, `lastRunStatus: "success"`, `lastThreadId`
10. On error: store error message in the thread's messages, log activity with `success: false`, update `Task` row with `lastRunStatus: "error"`

**User context:** Tasks run as the first admin user. Single-user app simplifies auth context for tool access.

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
- **Restart guard:** On scheduler init, compare `lastRunAt` against the task's cron schedule. If the next run after `lastRunAt` is in the past but within a short window (e.g., <60s ago), skip it to prevent double-runs after a quick restart.
- **Durable history:** When a task file is deleted, set `fileExists: false` instead of deleting the row. The task still appears in the UI (greyed out) with its run history intact.
- **UI data source:** The task list page queries this table (joined with live scheduler state for next run time) rather than relying solely on in-memory state. This means the list is available even when `DISABLE_CRON=true`.

**Sync behavior:**
- On scheduler init and on file add/change: upsert `Task` row with current frontmatter values
- On file delete: set `fileExists: false`, stop the cron job
- After each run: update `lastRunAt`, `lastRunStatus`, `lastThreadId`

**`ChatThread` changes:**
- Add column `type String @default("chat")` — values: `chat`, `task`
- Add column `sourceTaskFile String?` — the filename of the task that created this thread (for grouping runs)
- Add index on `[userId, type, updatedAt]`

**Query changes:**
- All existing chat queries (`getChatPageData`, etc.) must add `WHERE type = 'chat'` filter
- New server functions for task runs: filter `WHERE type = 'task'` with optional `sourceTaskFile` filter

**`ChatUsageEvent` changes:**
- `taskType` already exists and defaults to `"chat"`. Task runs use `"task"`. No schema change needed.

### Task management UI

**Route:** `/tasks`

**List view:**
- Data source: `Task` table (durable) joined with live scheduler state (next run time from croner). Works even when `DISABLE_CRON=true` since the table persists.
- Columns: title, cron (human-readable via `cronstrue` or similar), next run, last run time, last run status (success/error), enabled/disabled
- Row actions: view run history, link to edit file in Obsidian editor (`/o/{configPath}/tasks/{filename}`)
- Visual indicators: disabled tasks (dimmed), tasks past `endDate` (badge), deleted task files (`fileExists: false` — greyed out, "file removed" label), `DISABLE_CRON` state
- "Run now" button per task for manual trigger / testing (hidden when file deleted)
- Banner when `DISABLE_CRON=true` explaining that the scheduler is globally disabled

**Run history view:**
- Clicking a task navigates to `/tasks/:filename` showing past runs
- Past runs are `ChatThread` records where `sourceTaskFile` matches
- Each run shows: timestamp, model, duration, token usage, estimated cost, status
- Expandable run detail: full prompt (user message), full response (rendered markdown including tool calls/results)
- Delete button per run (deletes the `ChatThread` record)

### CLI tooling

- `pnpm ai-config:seed` — include `tasks/` folder with example file(s) and `task-prompt.md`
- `pnpm ai-config:pull` — include `tasks/` and `task-prompt.md` in pull
- `pnpm tasks:run <filename>` — manually trigger a specific task for testing (bypasses cron schedule, runs immediately, respects `DISABLE_CRON` only if explicitly overridden with `--force`)

## Open Questions

None — all questions resolved.

## Implementation Plan

Suggested build order:

1. **Schema migration** — New `Task` model, add `type` and `sourceTaskFile` to `ChatThread`, update existing chat queries to filter `WHERE type = 'chat'`
2. **Chat harness abstraction** — Extract shared execution logic from chat API into `src/lib/ai-executor.ts`, refactor chat API to use it
3. **Task file format + validator** — Zod schema, validator registration, example files in `examples/ai-config/tasks/`
4. **Task system prompt** — `task-prompt.md` config file, validator, example, config reader with fallback
5. **Scheduler engine** — Install cron library, build singleton scheduler with chokidar watcher (mirror `vault-index.ts` pattern), `DISABLE_CRON` env check
6. **Execution pipeline** — Wire scheduler triggers to shared harness, store results, track usage, log activity
7. **UI — Task list** — Route, server functions, list component with cron display, status, and `DISABLE_CRON` banner
8. **UI — Run history** — Run detail view with rendered markdown responses
9. **CLI updates** — Seed/pull for tasks folder + task-prompt, `tasks:run` manual trigger
10. **Polish** — Cost guards (`maxTokens`), concurrency locks, manual "run now" button, error display

## Change Log

- 2026-03-16: Initial requirements draft
- 2026-03-16: Resolved open questions — full tool access, multi-turn agent loop, `/tasks` route, `enabled` flag, `maxTokens` guard, chat harness abstraction, scheduler runs in dev, runs kept forever, endDate silently skips
- 2026-03-16: Added task-prompt.md config, DISABLE_CRON env var, chokidar file watching (same pattern as vault-index.ts), scheduler singleton with eager init on import
- 2026-03-16: Verified croner API — confirmed fit. Documented full API mapping, options config, and key simplifications (protect, stopAt, paused replace manual guards)
- 2026-03-16: Added `Task` DB table for durable job tracking — restart guard via `lastRunAt`, `fileExists` flag for deleted files, UI data source independent of scheduler state
