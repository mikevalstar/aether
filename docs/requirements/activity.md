---
title: Activity Log
status: done
owner: self
last_updated: 2026-03-22
canonical_file: docs/requirements/activity.md
---

# Activity Log

## Purpose

- Problem: When the AI bot or the user edits Obsidian files, there's no audit trail — no way to see what changed, when, or to revert a bad edit.
- Outcome: A top-level Activity page that logs all file writes/edits (AI and manual), shows diffs, and lets the user view the current file or revert to the original version. The system also logs other activity types (cron tasks, workflows, system tasks, AI notifications) and supports plugin-defined types.
- Notes: Activity is a generic, typed log. File-change tracking is the first activity type; cron tasks, workflows, system tasks, AI notifications, and plugin types are now implemented.

## Current Reality

- Current behavior: Activity logging is fully implemented. All AI tool calls and manual saves create activity records. Additional activity types (cron tasks, workflows, system tasks, notifications) are logged by their respective executors.
- Constraints: SQLite via Prisma; file content snapshots will increase DB size over time. Obsidian vault is local filesystem.
- Non-goals: Real-time collaboration tracking, file locking, undo across multiple edits (single-step revert only for now).

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Data model | done | A generic `ActivityLog` table with a `type` discriminator, a `metadata` JSON blob for flexible context (e.g., chatThreadId), and a `FileChangeDetail` table for file-specific data. |
| Write interception | done | AI file writes (`obsidian_write`, `obsidian_edit`), manual saves (`saveObsidianDocument`), kanban board changes (`board.server.ts`), new document creation, and chat exports must create an activity record with the original file content and the new content before persisting. |
| Activity list page | done | Top-level `/activity` route in nav showing a chronological list of activity entries, filterable by type. |
| File change detail | done | Each file-change entry can be expanded/opened to show a diff view (original vs. new), the current file state, and a revert action. |
| Revert | done | User can revert a file-change entry, restoring the original content. Revert itself creates a new activity record. |
| Deleted file handling | done | If the file no longer exists on disk, the UI should indicate this and still allow viewing the recorded original/new content. Revert on a deleted file should recreate it. |
| Extensibility | done | The activity system supports adding new activity types without schema changes to the core `ActivityLog` table — type-specific data goes in linked tables. Implemented types: `file_change`, `cron_task`, `workflow`, `system_task`, `ai_notification`, and plugin-defined types (`plugin:<id>:<type>`). |
| Chat thread detail | done | For `cron_task`, `workflow`, and `system_task` entries with a `chatThreadId` in metadata, the detail dialog fetches and displays the associated ChatThread with full message history via the `RunMessages` component. |
| Notification detail | done | For `ai_notification` entries, the detail dialog shows the notification title, body, link, and whether it was pushed to the phone. |
| Dashboard digest | done | An `ActivityDigest` widget on the dashboard shows recent activity entries with a "View all" link to `/activity`. |
| Deep-link detail | done | The detail dialog can be opened via a `detail` URL search param for direct linking to a specific activity entry. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| ActivityLog model | done | Generic activity record: id, type, summary, metadata (JSON), userId, createdAt. Type is a string (`file_change`, `cron_task`, `workflow`, `system_task`, `ai_notification`, or `plugin:<id>:<type>`). Metadata stores flexible context like chatThreadId. | Inline |
| FileChangeDetail model | done | Linked to ActivityLog: filePath, originalContent (nullable for new files), newContent, changeSource (`ai` or `manual`), toolName (nullable). | Inline |
| Capture on AI write | done | In `obsidian-write.ts`, read current file content before overwrite, create ActivityLog + FileChangeDetail. | Inline |
| Capture on AI edit | done | In `obsidian-edit.ts`, read current file content before edit, create ActivityLog + FileChangeDetail with new full content. | Inline |
| Capture on manual save | done | In `saveObsidianDocument()`, read current file content before write, create ActivityLog + FileChangeDetail with source `manual`. | Inline |
| Capture on board changes | done | In `board.server.ts`, kanban board writes create ActivityLog + FileChangeDetail. Used by both AI tools and manual board operations. | Inline |
| Capture on chat export | done | In `chat.functions.ts`, exporting a chat thread to Obsidian creates an ActivityLog + FileChangeDetail with source `manual`. | Inline |
| Capture on new document | done | In `obsidian.functions.ts`, creating a new Obsidian document creates an ActivityLog + FileChangeDetail with `originalContent: null`. | Inline |
| Capture on cron task run | done | In `task-executor.ts`, successful and failed cron task runs create ActivityLog entries with type `cron_task` and `chatThreadId` in metadata. | Inline |
| Capture on workflow run | done | In `workflow-executor.ts`, successful and failed workflow runs create ActivityLog entries with type `workflow` and `chatThreadId` in metadata. | Inline |
| Capture on system task | done | In `system-tasks.ts`, system maintenance tasks (cleanup stale records, cleanup old notifications) create ActivityLog entries with type `system_task`. | Inline |
| Capture on AI notification | done | In `send-notification.ts`, AI-sent notifications create ActivityLog entries with type `ai_notification` and notification details in metadata. | Inline |
| Plugin activity logging | done | Plugins can log custom activity types via `ctx.logActivity()` in `plugin-context.ts`. Types are prefixed as `plugin:<pluginId>:<type>`. Plugins can register `activityTypes` to add filter chips to the activity page. | Inline |
| Activity list route | done | `/activity` — authenticated, paginated list with type filter chips. Each row: timestamp, type badge, summary, file path (for file changes), source badge. | Inline |
| File change detail view | done | Dialog showing: tabbed view with diff, original content, new content, and current file content (or "file deleted" state). Includes copyable file path, source badge, tool name badge, and file status indicator (Current / Modified since / Deleted). | Inline |
| Chat thread detail view | done | For cron/workflow/system_task entries, the detail dialog displays the associated ChatThread's messages via `RunMessages`, with model, token count, and cost metadata. | Inline |
| Notification detail view | done | For `ai_notification` entries, the detail dialog shows notification title, body, link, and push-to-phone status. | Inline |
| Revert action | done | Button on file-change detail to restore original content. Writes originalContent back to disk and creates a new `file_change` activity record for the revert. If `originalContent` is null (file was new), revert deletes the file. | Inline |
| Nav integration | done | "Activity" link in Header nav under system links. Also in CommandPalette (`Cmd+K`). | Inline |
| Dashboard digest | done | `ActivityDigest` component in `src/components/dashboard/ActivityDigest.tsx` shows recent activity on the dashboard with type icons and relative timestamps. | Inline |
| Deep-link support | done | URL search param `detail=<id>` auto-opens the detail dialog on page load/navigation for shareable links. | Inline |
| Storybook stories | done | Stories for `ActivityTable`, `ActivityDetailDialog`, `ContentView`, and `DiffView` in `src/components/activity/`. | Inline |

## Detail

### Data model

- `ActivityLog`: id (cuid), type (string), summary (string), metadata (string, nullable — JSON blob for extra context per type), createdAt (datetime), userId (FK to User).
- Keep `ActivityLog` generic — store flexible context in `metadata` JSON (e.g., chatThreadId, model name, tool arguments) so new activity types don't require schema changes to the core table.
- `FileChangeDetail`: id (cuid), activityLogId (FK, unique), filePath (string), originalContent (string, nullable — null when file was new), newContent (string), changeSource (string: `ai` | `manual`), toolName (string, nullable — e.g., `obsidian_write`, `obsidian_edit`, null for manual).
- AI-triggered file changes should store `chatThreadId` in the `ActivityLog.metadata` JSON for cross-referencing with the chat that caused the change.
- Index on `ActivityLog(userId, createdAt)` and `ActivityLog(userId, type, createdAt)`.
- No retention/cleanup policy for now — keep all records indefinitely.
- Activity types: `file_change` (with FileChangeDetail), `cron_task`, `workflow`, `system_task`, `ai_notification`, and `plugin:<id>:<type>` (all using metadata JSON for type-specific data).

### Write interception

- **AI writes** (`obsidian-write.ts`): Before `fs.writeFile`, read existing file (if it exists). After successful write, insert ActivityLog (type: `file_change`, summary: `"AI wrote {filename}"`) and FileChangeDetail.
- **AI edits** (`obsidian-edit.ts`): Before replacement, read full file content as original. After successful edit, insert records with the full new file content.
- **Manual saves** (`obsidian.functions.ts` → `saveObsidianDocument`): Same pattern — read before write, log with source `manual`.
- **New document creation** (`obsidian.functions.ts`): Log with `originalContent: null` and source `manual`.
- **Kanban board changes** (`board.server.ts` → `saveBoardAndLog`): After writing the serialized board, log with the original and new content. Used by both AI board tools and manual board operations.
- **Chat export** (`chat.functions.ts`): Exporting a chat thread to Obsidian logs the exported markdown content with source `manual`.
- **Cron task runs** (`task-executor.ts`): After execution, log with type `cron_task` and chatThreadId in metadata (both success and failure).
- **Workflow runs** (`workflow-executor.ts`): After execution, log with type `workflow` and chatThreadId in metadata (both success and failure).
- **System tasks** (`system-tasks.ts`): Maintenance operations (cleanup stale records, cleanup old notifications) log with type `system_task`.
- **AI notifications** (`send-notification.ts`): When AI sends a notification, log with type `ai_notification` and notification details in metadata.
- **Plugin activity** (`plugin-context.ts`): Plugins log via `ctx.logActivity()` with type `plugin:<pluginId>:<type>`.
- All captures should be non-blocking to the write operation — if logging fails, the write should still succeed (log the error, don't block the user).

### Activity list page

- Route: `/activity`, gated behind `ensureSession()`.
- Default view: all activity types, newest first, 50 per page.
- Pagination via Shadcn pagination widget with windowed page numbers (showing pages within 2 of current, plus first and last).
- Filter chips for activity type: All, File Changes, Cron Tasks, Workflows, System Tasks, Notifications, plus dynamically registered plugin types.
- Each row: relative timestamp, type badge (color-coded icon per type), summary text, file path (for file changes), source badge (AI/Manual for file changes).
- Clicking a row opens the detail dialog.
- URL search params: `page` (pagination), `type` (filter), `detail` (auto-open detail dialog).

### File change detail and revert

- Opens in a dialog (`ActivityDetailDialog`) with a tabbed content area.
- **Diff tab**: Unified inline diff between original and new content using the `diff` library (`createPatch`). Shows line numbers, add/remove/context coloring, and diff stats (lines added/removed). New files show all lines as additions.
- **Original tab**: Raw original content (or "(new file — no original content)").
- **New tab**: Raw new content.
- **Current tab**: Current file content read from disk (only shown if file exists).
- Header shows: summary, copyable file path, source badge (AI/Manual), tool name badge, file status indicator (Current / Modified since / Deleted), and relative timestamp.
- "File no longer exists" banner when file is deleted.
- "Revert" button: writes `originalContent` back to disk at `filePath`, creates a new activity log entry (type: `file_change`, summary: `"Reverted {filename}"`, source: `manual`). If `originalContent` is null (file was new), revert deletes the file.

### Chat thread detail

- For `cron_task`, `workflow`, and `system_task` entries, the detail dialog checks for a `chatThreadId` in the ActivityLog metadata.
- If found, fetches the associated ChatThread including messages, system prompt, available tools, token counts, and cost.
- Displays model badge, token count, and cost in a metadata bar.
- Renders the full message history using the shared `RunMessages` component.

### Notification detail

- For `ai_notification` entries, the detail dialog shows a dedicated `NotificationDetail` view.
- Displays notification title, body, and link from the metadata JSON.
- Shows a "Pushed to phone" badge if `pushToPhone` was true.

### Dashboard digest

- The `ActivityDigest` component (`src/components/dashboard/ActivityDigest.tsx`) displays recent activity on the dashboard.
- Shows type icon, summary, and relative timestamp for each entry.
- Includes a "View all" link to `/activity`.

## Resolved Decisions

- **Retention**: No cleanup policy for now — keep all records.
- **Diff view**: Unified inline diff (density-first) using the `diff` library.
- **Cross-referencing**: Yes — store chatThreadId in `ActivityLog.metadata` JSON for AI-triggered changes.
- **Page size**: 50 per page, using Shadcn pagination widget.
- **Detail view**: Dialog-based (not inline expandable or separate route).
- **Activity types**: Five built-in types (`file_change`, `cron_task`, `workflow`, `system_task`, `ai_notification`) plus plugin-defined types.

## Open Questions

- None at this time.

## Change Log

- 2026-03-22: Updated requirements to reflect current state — added documentation for all activity types (cron_task, workflow, system_task, ai_notification, plugin types), additional write interception points (board changes, chat export, new document creation), chat thread detail view, notification detail view, dashboard digest, deep-link support, storybook stories, and plugin activity logging.
- 2026-03-15: Implemented all requirements — schema, write interception, activity list page, detail view with diff, revert, nav integration.
- 2026-03-15: Resolved open questions — no cleanup, inline diff, chatThreadId in metadata, 50/page with Shadcn pagination.
- 2026-03-15: Created initial activity log requirements from feature discussion.
