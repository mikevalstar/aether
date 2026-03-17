---
title: System Tasks
status: done
owner: Mike
last_updated: 2026-03-16
canonical_file: docs/requirements/system-tasks.md
---

# System Tasks

## Purpose

- Problem: Over time, stale database records accumulate — e.g., Task and Workflow rows synced from config files that were deleted before ever being run. No automated housekeeping exists.
- Outcome: Code-defined system tasks run on cron schedules within the existing task scheduler, performing maintenance like cleaning up stale records. They log to activity only when they actually do something.
- Notes: Unlike periodic tasks (file-based, AI-driven), system tasks are hardcoded in the app. They don't need AI, don't create ChatThreads, and don't need a UI. They share the scheduler infrastructure but are registered programmatically.

## Current Reality

- Current behavior: The task scheduler (`src/lib/task-scheduler.ts`) manages file-based cron tasks via chokidar. Task and Workflow DB rows persist with `fileExists: false` when config files are deleted, but are never cleaned up. No system-level maintenance jobs exist.
- Constraints: Same single-process Node server. Scheduler uses `croner`. Activity logging via `ActivityLog` table is available for any activity type.
- Non-goals: Not a general-purpose job framework. Not for AI-driven tasks (those are periodic tasks). No UI for managing system tasks — they're defined in code.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| System task registration | done | A way to register code-defined cron jobs in the existing scheduler alongside file-based tasks |
| Stale record cleanup task | done | Hourly task that deletes Task and Workflow rows where `fileExists = false` AND `lastRunAt IS NULL` (never executed) |
| Activity logging | done | Log an activity entry (type: `system_task`) only when records are actually deleted, with count and details in metadata |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| System task infrastructure | done | Register hardcoded cron jobs in the scheduler on init | Inline |
| Cleanup stale records task | done | Delete never-run Task/Workflow rows whose files no longer exist | Inline |

## Detail

### System task infrastructure

The existing scheduler in `task-scheduler.ts` manages file-based tasks. System tasks should be registered alongside them during `initScheduler()` as additional `Cron` jobs.

- Define system tasks as an array of `{ name, cron, handler }` objects in a dedicated module (e.g., `src/lib/system-tasks.ts`)
- Register them in `initScheduler()` after file-based tasks are set up
- Use the same `croner` options: `protect: true`, `catch`, `unref: true`, timezone
- System task cron jobs are not tracked in the `Task` DB table — they're internal
- On `closeScheduler()`, stop system task jobs along with file-based ones

### Cleanup stale records task

**Schedule:** Every hour (`0 * * * *`)

**Logic:**
1. Query `Task` table for rows where `fileExists = false` AND `lastRunAt IS NULL`
2. Query `Workflow` table for rows where `fileExists = false` AND `lastRunAt IS NULL`
3. If any results found:
   - Delete the matching rows
   - Create an `ActivityLog` entry with:
     - `type`: `"system_task"`
     - `summary`: e.g., `"Cleaned up 2 stale task(s) and 1 stale workflow(s)"`
     - `metadata`: JSON with `{ taskName: "cleanup-stale-records", deletedTasks: [...filenames], deletedWorkflows: [...filenames] }`
     - `userId`: first admin user (same pattern as task executor)
4. If no stale records found: do nothing (no activity entry)

**What qualifies as stale:**
- `fileExists = false` — the config file was deleted from the Obsidian vault
- `lastRunAt IS NULL` — the task/workflow was never executed, so there's no run history to preserve
- Records that *were* run at least once are kept even after file deletion (they have run history worth preserving)

## Open Questions

None.

## Implementation Plan

1. **System task module** — Create `src/lib/system-tasks.ts` with the task registry and the cleanup handler
2. **Scheduler integration** — Hook system tasks into `initScheduler()` and `closeScheduler()`
3. **Cleanup handler** — Implement the stale record deletion logic with conditional activity logging

## Change Log

- 2026-03-16: Initial requirements draft
- 2026-03-16: Implemented — system-tasks.ts module, scheduler integration, activity filter types added
