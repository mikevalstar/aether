# Task Lifecycle

Reference guide for how periodic AI tasks move from file on disk to scheduled execution and recorded history.

## Overview

Tasks are markdown files with YAML frontmatter that live in the `tasks/` subdirectory of the AI config folder (`OBSIDIAN_DIR/OBSIDIAN_AI_CONFIG/tasks/`). Each file defines a prompt that gets sent to Claude on a cron schedule. The system watches for file changes at runtime — no restart required.

## Key Files

| Area | File | Purpose |
|------|------|---------|
| **Schema** | `prisma/schema.prisma` (model `Task`) | Database model for task metadata and run state |
| **Validation** | `src/lib/ai-config-validators/task.ts` | Zod schema + validation for task frontmatter |
| **System prompt config** | `src/lib/ai-config-validators/task-prompt.ts` | Validates the shared `task-prompt.md` system prompt file |
| **Scheduler** | `src/lib/task-scheduler.ts` | File watcher, cron job creation, DB sync |
| **Executor** | `src/lib/task-executor.ts` | Runs a task: calls Anthropic API, stores results |
| **System tasks** | `src/lib/system-tasks.ts` | Built-in housekeeping cron jobs (cleanup) |
| **Server functions** | `src/lib/task.functions.ts` | API layer: list tasks, trigger runs, get history, delete runs |
| **UI — list** | `src/components/tasks/TaskTable.tsx` | Task list table with status, schedule, run-now button |
| **UI — history** | `src/components/tasks/TaskRunHistory.tsx` | Expandable run history for a single task |
| **UI — empty** | `src/components/tasks/TaskEmptyState.tsx` | Shown when no tasks exist |
| **Route — index** | `src/routes/tasks/index.tsx` | Tasks list page |
| **Route — detail** | `src/routes/tasks/$.tsx` | Single task run history page |

## 1. Task File Format

A task file is a markdown file parsed by `gray-matter`. Frontmatter is validated by `taskFrontmatterSchema` in `src/lib/ai-config-validators/task.ts`.

```yaml
---
title: Daily summary           # required — human-readable name
cron: "0 9 * * *"              # required — 5-field cron expression
model: claude-haiku-4-5        # optional — overrides default from task-prompt.md
effort: low                    # optional — low | medium | high
enabled: true                  # optional — default true; false pauses scheduling
endDate: "2026-12-31"          # optional — ISO 8601; task stops after this date
maxTokens: 4096                # optional — output token limit
timezone: America/Toronto      # optional — IANA timezone; defaults to server tz
notification: notify           # optional — silent | notify | push (default: notify)
---

Your prompt goes here. Supports placeholders:
- {{date}} — today's date
- {{userName}} — admin user's name
- {{aiMemoryPath}} — path to AI memory directory
```

### Validation rules (`src/lib/ai-config-validators/task.ts`)

- `cron` is checked with croner's `new Cron(expr, { paused: true })` — must be a valid 5-field expression
- `endDate` is parsed with `new Date()` and checked for `NaN`
- `timezone` uses `Intl.DateTimeFormat(undefined, { timeZone: val })` to validate against the runtime's IANA database
- `body` (the markdown content below frontmatter) must be non-empty

## 2. Initialization & File Watching

Entry point: `initScheduler()` in `src/lib/task-scheduler.ts`. Called eagerly on module load (`void initScheduler()` at bottom of file).

### Startup sequence

1. **Resolve tasks directory** — `OBSIDIAN_DIR` + `OBSIDIAN_AI_CONFIG` + `/tasks/`. If env vars are missing, scheduler skips entirely.
2. **Check for `DISABLE_CRON=true`** — if set, the scheduler syncs task metadata to the DB but does not create cron jobs or the file watcher. Useful for secondary instances.
3. **Read all `.md` files** in the tasks directory.
4. **Find admin user** — tasks run as the first admin user (`prisma.user.findFirst({ where: { role: "admin" } })`). If none exists, init aborts.
5. **Parse & validate each file** — via `parseTaskFile()` which uses `gray-matter` + `taskValidator.validate()` + `taskFrontmatterSchema.parse()`.
6. **Upsert DB rows** — `upsertTaskRow()` syncs frontmatter fields (title, cron, model, effort, enabled, endDate, maxTokens, timezone) to the `Task` table, setting `fileExists: true`.
7. **Create cron jobs** — `createCronJob()` creates a `Cron` instance per task. Disabled tasks get a paused job (so `nextRun` is still computable).
8. **Mark deleted files** — any existing `Task` row whose file wasn't found gets `fileExists: false`.
9. **Start file watcher** — `chokidar.watch()` on the tasks directory, filtering to `.md` files only.
10. **Register system tasks** — `startSystemTasks()` from `src/lib/system-tasks.ts`.

### File watcher events (`src/lib/task-scheduler.ts`)

| Event | Handler | Behavior |
|-------|---------|----------|
| `add` / `change` | `handleFileAddOrChange()` | Stops existing cron job, re-parses file, upserts DB row, creates new cron job |
| `unlink` | `handleFileDelete()` | Stops cron job, removes from in-memory map, sets `fileExists: false` in DB |

## 3. Cron Job Creation

`createCronJob()` in `src/lib/task-scheduler.ts` handles three scenarios:

### Disabled tasks
Creates a **paused** cron job (`{ paused: true }`) so that `nextRun()` still returns a value for display in the UI, but the callback never fires.

### Restart guard
When the app restarts, there's a risk of double-running a task that just fired. The guard works by:
1. Taking the task's `lastRunAt` from the DB
2. Computing what the next scheduled run after that time would be
3. If that next run is in the past but within the **grace window** (60 seconds), it means the task just ran — so it sets `startAt` to the *following* scheduled run to skip the duplicate

### Active tasks
Creates a cron job with:
- `timezone` — from task frontmatter, falling back to `Intl.DateTimeFormat().resolvedOptions().timeZone` (server default)
- `protect: true` — prevents overlapping executions
- `unref: true` — doesn't keep the process alive
- `stopAt` — set to `endDate` if provided
- `startAt` — set by restart guard if applicable
- Callback: `() => void executeTask(filename, config)`

## 4. Task Execution

`executeTask()` in `src/lib/task-executor.ts` is called by the cron callback or by manual trigger.

### Execution flow

1. **Find admin user** — same first-admin lookup as init
2. **Resolve model & effort** — priority: task frontmatter > `task-prompt.md` defaults > system defaults. Resolution functions: `resolveModel()`, `resolveEffort()` at bottom of `src/lib/task-executor.ts`
3. **Create ChatThread** — a new `ChatThread` row with `type: "task"` and `sourceTaskFile: filename`
4. **Substitute placeholders** — `{{date}}`, `{{userName}}`, `{{aiMemoryPath}}` in the task body
5. **Create tools** — `createAiTools()` from `src/lib/ai-tools.ts` gives the task access to the same tool set as chat
6. **Call Anthropic API** — `generateText()` from Vercel AI SDK with:
   - System prompt from `task-prompt.md` (read via `readTaskPromptConfig()`)
   - Task body as the user prompt
   - `stopWhen: stepCountIs(10)` — max 10 tool-use steps
   - `maxTokens` override if set in frontmatter
   - `effort` applied via `providerOptions.anthropic` if the model supports it
   - Ephemeral cache control enabled

### On success

A single `prisma.$transaction` writes:
- **ChatThread update** — stores `messagesJson`, `usageHistoryJson`, token counts, cost, system prompt, tool names
- **ChatUsageEvent** — usage tracking row
- **ActivityLog** — `type: "cron_task"` with metadata (tokens, cost, duration)
- **Task update** — `lastRunAt`, `lastRunStatus: "success"`, `lastThreadId`

Then sends a notification (unless `notification: "silent"`).

### On failure

Same transaction pattern but:
- ChatThread gets an error message in `messagesJson`
- ActivityLog records `success: false` with the error
- Task row gets `lastRunStatus: "error"`
- Notification always sends on failure (with `pushToPhone: true`)

## 5. Manual Trigger

Users can trigger a task immediately via the "Run Now" button in the UI.

**Flow:** `TaskTable.tsx` → `triggerTaskRun()` server function (`src/lib/task.functions.ts`) → `schedulerTriggerTask()` (`src/lib/task-scheduler.ts`) → `executeTask()`.

This bypasses the cron schedule entirely and calls `executeTask()` directly with the in-memory `TaskConfig`.

## 6. Data Model

### Task table (`prisma/schema.prisma`)

Stores the synced state of each task file. Key fields:

| Field | Purpose |
|-------|---------|
| `filename` | Unique key — the `.md` filename |
| `title`, `cron`, `model`, `effort`, `enabled`, `endDate`, `maxTokens`, `timezone` | Synced from frontmatter on every file change |
| `lastRunAt`, `lastRunStatus`, `lastThreadId` | Updated after each execution |
| `fileExists` | `false` when the file is deleted but the DB row is retained for history |

### ChatThread (run records)

Each task execution creates a `ChatThread` with `type: "task"` and `sourceTaskFile` set to the filename. This is how run history is queried — `getTaskRunHistory()` in `src/lib/task.functions.ts` filters by these fields.

## 7. System Tasks

Defined in `src/lib/system-tasks.ts`. These are code-defined (not file-based) cron jobs registered after the scheduler initializes.

| Task | Schedule | Purpose |
|------|----------|---------|
| `cleanup-stale-records` | Hourly (`0 * * * *`) | Deletes `Task` and `Workflow` rows where `fileExists: false` and `lastRunAt: null` (never ran) |
| `cleanup-old-notifications` | Daily at 3 AM (`0 3 * * *`) | Deletes read notifications older than 30 days |

Both log to `ActivityLog` with `type: "system_task"` when they delete records.

## 8. Shutdown

`closeScheduler()` in `src/lib/task-scheduler.ts`:
1. Calls `stopSystemTasks()` — stops all system cron jobs
2. Stops all task cron jobs
3. Closes the chokidar file watcher
4. Resets state

Triggered by `SIGTERM`, `SIGINT`, and Vite HMR dispose.

## 9. UI Layer

### Task list page (`src/routes/tasks/index.tsx`)

Calls `getTasksPageData()` which merges DB rows with live scheduler info (nextRun, isBusy). Shows a warning banner if `DISABLE_CRON=true`.

### Task table (`src/components/tasks/TaskTable.tsx`)

Displays each task with:
- Title (links to detail page)
- Model badge
- Schedule (human-readable via `cronstrue`, raw cron in tooltip)
- Timezone (shown below schedule if set, also in tooltip)
- Next run / last run (relative time)
- Status badge (success/error)
- File-removed / paused badges when applicable
- Run Now button

### Task detail page (`src/routes/tasks/$.tsx`)

Calls `getTaskRunHistory()` for a specific task filename.

### Run history (`src/components/tasks/TaskRunHistory.tsx`)

Shows task metadata (cron, model, timezone, enabled/file status) and an expandable table of past runs with:
- Timestamp, model, token count, cost
- Expandable detail view showing full messages, system prompt, and available tools (via `RunMessages` shared component)
- Delete button per run

## 10. Configuration Hierarchy

Task behavior is configured at multiple levels, with this priority (highest first):

1. **Task frontmatter** — model, effort, maxTokens, timezone, notification per task
2. **`task-prompt.md` frontmatter** — default model and effort for all tasks (`src/lib/ai-config-validators/task-prompt.ts`)
3. **System defaults** — `DEFAULT_CHAT_MODEL` (Haiku 4.5), `DEFAULT_CHAT_EFFORT` (low), server timezone
