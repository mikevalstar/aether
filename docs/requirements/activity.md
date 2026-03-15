---
title: Activity Log
status: todo
owner: self
last_updated: 2026-03-15
canonical_file: docs/requirements/activity.md
---

# Activity Log

## Purpose

- Problem: When the AI bot or the user edits Obsidian files, there's no audit trail — no way to see what changed, when, or to revert a bad edit.
- Outcome: A top-level Activity page that logs all file writes/edits (AI and manual), shows diffs, and lets the user view the current file or revert to the original version. The system is extensible to other activity types (cron jobs, etc.) in the future.
- Notes: Activity is a generic, typed log. File-change tracking is the first activity type; others will follow.

## Current Reality

- Current behavior: No activity logging exists. AI tool calls (obsidian_write, obsidian_edit) and manual saves (`saveObsidianDocument`) execute without recording before/after state.
- Constraints: SQLite via Prisma; file content snapshots will increase DB size over time. Obsidian vault is local filesystem.
- Non-goals: Real-time collaboration tracking, file locking, undo across multiple edits (single-step revert only for now).

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Data model | todo | A generic `ActivityLog` table with a `type` discriminator, a `metadata` JSON blob for flexible context (e.g., chatThreadId), and a `FileChangeDetail` table for file-specific data. |
| Write interception | todo | AI file writes (`obsidian_write`, `obsidian_edit`) and manual saves (`saveObsidianDocument`) must create an activity record with the original file content and the new content before persisting. |
| Activity list page | todo | Top-level `/activity` route in nav showing a chronological list of activity entries, filterable by type. |
| File change detail | todo | Each file-change entry can be expanded/opened to show a diff view (original vs. new), the current file state, and a revert action. |
| Revert | todo | User can revert a file-change entry, restoring the original content. Revert itself creates a new activity record. |
| Deleted file handling | todo | If the file no longer exists on disk, the UI should indicate this and still allow viewing the recorded original/new content. Revert on a deleted file should recreate it. |
| Extensibility | todo | The activity system must support adding new activity types (e.g., cron task logs) without schema changes to the core `ActivityLog` table — type-specific data goes in linked tables. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| ActivityLog model | todo | Generic activity record: id, type, summary, metadata (JSON), userId, createdAt. Type is an enum-like string (e.g., `file_change`, future: `cron_task`). Metadata stores flexible context like chatThreadId. | Inline |
| FileChangeDetail model | todo | Linked to ActivityLog: filePath, originalContent (nullable for new files), newContent, changeSource (`ai` or `manual`), toolName (nullable). | Inline |
| Capture on AI write | todo | In `obsidian-write.ts`, read current file content before overwrite, create ActivityLog + FileChangeDetail. | Inline |
| Capture on AI edit | todo | In `obsidian-edit.ts`, read current file content before edit, create ActivityLog + FileChangeDetail with new full content. | Inline |
| Capture on manual save | todo | In `saveObsidianDocument()`, read current file content before write, create ActivityLog + FileChangeDetail with source `manual`. | Inline |
| Activity list route | todo | `/activity` — authenticated, paginated list with type filter chips. Each row: timestamp, type icon, summary, file path (for file changes). | Inline |
| File change detail view | todo | Expandable or linked detail showing: diff view (side-by-side or inline), original content, new content, current file content (or "file deleted" state). | Inline |
| Revert action | todo | Button on file-change detail to restore original content. Writes originalContent back to disk and creates a new `file_change` activity record for the revert. | Inline |
| Nav integration | todo | Add "Activity" link to Header nav between existing items. | Inline |

## Detail

### Data model

- `ActivityLog`: id (cuid), type (string), summary (string), metadata (string, nullable — JSON blob for extra context per type), createdAt (datetime), userId (FK to User).
- Keep `ActivityLog` generic — store flexible context in `metadata` JSON (e.g., chatThreadId, model name, tool arguments) so new activity types don't require schema changes to the core table.
- `FileChangeDetail`: id (cuid), activityLogId (FK), filePath (string), originalContent (string, nullable — null when file was new), newContent (string), changeSource (string: `ai` | `manual`), toolName (string, nullable — e.g., `obsidian_write`, `obsidian_edit`, null for manual).
- AI-triggered file changes should store `chatThreadId` in the `ActivityLog.metadata` JSON for cross-referencing with the chat that caused the change.
- Index on `ActivityLog(userId, createdAt)` and `ActivityLog(userId, type, createdAt)`.
- No retention/cleanup policy for now — keep all records indefinitely.
- Future activity types (cron tasks, etc.) will get their own detail tables linked to `ActivityLog`.

### Write interception

- **AI writes** (`obsidian-write.ts`): Before `fs.writeFile`, read existing file (if it exists). After successful write, insert ActivityLog (type: `file_change`, summary: `"AI wrote {filename}"`) and FileChangeDetail.
- **AI edits** (`obsidian-edit.ts`): Before replacement, read full file content as original. After successful edit, insert records with the full new file content.
- **Manual saves** (`obsidian.functions.ts` → `saveObsidianDocument`): Same pattern — read before write, log with source `manual`.
- All captures should be non-blocking to the write operation — if logging fails, the write should still succeed (log the error, don't block the user).

### Activity list page

- Route: `/activity`, gated behind `ensureSession()`.
- Default view: all activity types, newest first, 50 per page.
- Pagination via Shadcn pagination widget.
- Filter chips for activity type (initially just `file_change`, more later).
- Each row: relative timestamp, type badge, summary text, file path as a link (for file changes).
- Clicking a row opens the detail view.

### File change detail and revert

- Shows a unified inline diff between original and new content (use a lightweight diff library).
- "View current" button reads the file from disk and displays it; if the file is deleted, show a "File no longer exists" notice.
- "Revert" button: writes `originalContent` back to disk at `filePath`, creates a new activity log entry (type: `file_change`, summary: `"Reverted {filename}"`, source: `manual`). If `originalContent` is null (file was new), revert should delete the file.

## Open Questions

- Should there be a retention/cleanup policy for old activity records to manage DB size?
- Should the diff view be inline (unified) or side-by-side? (Leaning inline for density.)
- Should activity records capture the chat thread ID that triggered an AI write, for cross-referencing?
- What's the desired page size for the activity list?

## Change Log

- 2026-03-15: Created initial activity log requirements from feature discussion.
