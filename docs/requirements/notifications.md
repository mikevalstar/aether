---
title: Notifications
status: done
owner: self
last_updated: 2026-04-08
canonical_file: docs/requirements/notifications.md
---

# Notifications

## Purpose

- Problem: Users need to know when background events happen (task completions, workflow results, failures) with appropriate urgency levels, and manage a history of notifications across multiple surfaces.
- Outcome: A two-channel notification system (in-browser + Pushover push) with six severity levels, full-page management, per-user push preferences, and a dashboard widget. Tasks and workflows control notification targeting and severity via frontmatter.
- Notes: Multi-user-ready — notifications target users by email. Admin-only `error` level reserved for system diagnostics.

## Environment Variables

| Variable | Purpose | Example |
| --- | --- | --- |
| `PUSHOVER_APP_TOKEN` | Pushover application API token (create app at pushover.net) | `azGDORePK8gMaC0QOYAMyEEuzJnyUi` |
| `APP_URL` | Base URL of the app, used for clickable links in push notifications | `https://aether.example.com` |

## Notification Levels

Defined in `src/lib/notify.ts` as `NotificationSeverity` with numeric ordering via `SEVERITY_ORDER`.

| Level | Severity | Description | Shown in header bell? | Default push? |
| --- | --- | --- | --- | --- |
| `info` | 0 | Informational — routine completions, status updates | No | No |
| `low` | 1 | Low priority — minor items worth noting | No | No |
| `medium` | 2 | Medium priority — notable events that deserve attention | Yes | No |
| `high` | 3 | High priority — important events requiring timely attention | Yes | No |
| `critical` | 4 | Critical — urgent issues requiring immediate action | Yes | Yes |
| `error` | 5 | System/execution errors — task/workflow failures | Yes (admin only) | Yes |

## Data Model

### Notification (`prisma/schema.prisma`)

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | String | cuid() | Primary key |
| `title` | String | — | Notification title |
| `body` | String? | — | Optional longer description |
| `link` | String? | — | Relative app URL for click-through (e.g. `/tasks/daily-summary.md?highlight=thread_abc`) |
| `level` | String | `"info"` | Severity: `info`, `low`, `medium`, `high`, `critical`, `error` |
| `category` | String? | — | Source type: `task`, `workflow`, `ai`, `system` |
| `source` | String? | — | Specific source identifier (e.g. task filename) |
| `read` | Boolean | false | Whether the user has seen it |
| `archived` | Boolean | false | Hidden from default views, separate from read |
| `pushToPhone` | Boolean | false | Whether a push was requested/sent |
| `pushedAt` | DateTime? | — | When Pushover push was sent |
| `createdAt` | DateTime | now() | Creation timestamp |
| `userId` | String | — | Owner user |

Indexes: `(userId, read, createdAt)`, `(userId, archived, level, createdAt)`.

### ScheduledNotification (`prisma/schema.prisma`)

Used for notifications/reminders that should be delivered at a future time. A background worker moves a row from `pending` to `sent` by calling `notify()` when its `scheduledAt` is due.

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | String | cuid() | Primary key |
| `title` | String | — | Notification title |
| `body` | String? | — | Optional longer description |
| `link` | String? | — | Optional relative app URL |
| `level` | String | `"low"` | Severity copied to the emitted Notification |
| `category` | String? | `"ai"` | Normally `"ai"` when created by the AI tool |
| `source` | String? | `"scheduled"` | Marked `"scheduled"` once delivered by the worker |
| `pushToPhone` | Boolean | false | Whether delivery should force a push |
| `scheduledAt` | DateTime | — | Absolute UTC time to deliver |
| `timezone` | String? | — | IANA timezone used when scheduling (stored for display) |
| `status` | String | `"pending"` | `pending`, `sent`, `cancelled`, `failed` |
| `sentAt` | DateTime? | — | When the notification was delivered |
| `cancelledAt` | DateTime? | — | When the user (or AI) cancelled it |
| `attempts` | Int | 0 | Delivery attempt count |
| `lastError` | String? | — | Error message from the last failed attempt |
| `notificationId` | String? | — | Id of the resulting `Notification` row once sent |
| `createdAt` | DateTime | now() | Creation timestamp |
| `updatedAt` | DateTime | now() | Auto-updated |
| `userId` | String | — | Owner user |

Indexes: `(status, scheduledAt)` for the worker query, `(userId, status, scheduledAt)` for the list page.

### Type System (`src/lib/notify.ts`)

- **`NotificationSeverity`** — `"info" | "low" | "medium" | "high" | "critical" | "error"` — controls importance and visibility.
- **`NotificationDelivery`** — `"silent" | "notify" | "push"` — controls whether to create a notification and/or push. Used in task/workflow frontmatter as the `notification` field.
- **`NotificationLevel`** — deprecated alias for `NotificationDelivery` (backward compat).
- **`severityMeetsThreshold(level, minLevel)`** — compares severity levels for push eligibility.

## User Preferences

Stored in `preferences` JSON on User model (`src/lib/preferences.ts`).

| Preference | Default | Description |
| --- | --- | --- |
| `pushoverUserKey` | — | Pushover user key. When blank, push notifications disabled. |
| `pushNotificationMinLevel` | `"critical"` | Minimum severity level to trigger automatic push. Configured at `/settings/notifications`. |

Settings UI: `src/routes/settings/notifications.tsx` — Pushover user key input, minimum push level dropdown, test send button.

Validation schema: `pushNotificationMinLevel` is registered in the `updatePreferencesInputSchema` in `src/lib/preferences.functions.ts`.

## Notify Utility (`src/lib/notify.ts`)

### `notify(params)`

Main entry point. Creates a DB record and optionally sends a Pushover push.

**Parameters:** `userId`, `title`, `body?`, `link?`, `level?` (default `"info"`), `category?`, `source?`, `pushToPhone?` (default `false`).

**Push logic:** A push is sent when:
1. `pushToPhone` is explicitly `true`, OR
2. The notification's `level` meets or exceeds the user's `pushNotificationMinLevel` preference (checked automatically when level is not `info`).

Pushover failures are logged as warnings but don't throw — the DB record is the source of truth.

### `notifyUsers(params)`

Sends to multiple users by email address. Accepts `emails: string[]` — `["all"]` targets all users, otherwise filters to matching emails. Calls `notify()` per user via `Promise.allSettled`.

## Notification Sources

| Source | Event | Level | Category | Source field | Link | Push behavior |
| --- | --- | --- | --- | --- | --- | --- |
| Task executor | Completed | Configurable via `notificationLevel` frontmatter (default: `info`) | `task` | Task filename | `/tasks/<filename>?highlight=<threadId>` | Per frontmatter + user pref |
| Task executor | Failed | `error` | `task` | Task filename | `/tasks/<filename>?highlight=<threadId>` | Always (unless `notification: silent`) |
| Workflow executor | Completed | Configurable via `notificationLevel` frontmatter (default: `info`) | `workflow` | Workflow filename | `/workflows/<filename>?highlight=<threadId>` | Per frontmatter + user pref |
| Workflow executor | Failed | `error` | `workflow` | Workflow filename | `/workflows/<filename>?highlight=<threadId>` | Always (unless `notification: silent`) |
| AI chat tool | User-triggered | Configurable per call (default: `low`) | `ai` | — | Optional (Claude decides) | Per call + user pref |
| System | Future diagnostics | `error` | `system` | — | — | Always |

Implementation: `sendExecutionNotification()` in `src/lib/executor-shared.ts` handles task/workflow notifications with multi-user targeting. AI tool in `src/lib/tools/send-notification.ts`.

## Task & Workflow Frontmatter

New fields added to task (`src/lib/ai-config-validators/task.ts`) and workflow (`src/lib/ai-config-validators/workflow.ts`) validators:

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `notification` | string | `notify` | Delivery behavior: `silent`, `notify`, `push` |
| `notificationLevel` | string | `info` | Severity level: `info`, `low`, `medium`, `high`, `critical` |
| `notifyUsers` | string[] | `["all"]` | Email addresses to notify, or `["all"]` for all users |
| `pushMessage` | boolean | `false` | Force push regardless of user preference level |

Parsed in `src/lib/task-scheduler/task-loader.ts` and `src/lib/workflow-watcher.ts`. Passed through `ExecutionContext` in `src/lib/executor-shared.ts` to the notification system.

## Major Features

### Full Page Notifications (`/notifications`)

**Route:** `src/routes/notifications.tsx`
**Server functions:** `src/lib/notifications-page.functions.ts`

- Filterable list with three filter controls: status (segmented button: Active/Unread/Read/Archived), level dropdown, category dropdown
- Bulk actions on selected notifications: mark read, mark unread, archive, delete — displayed inline on the right side of the filter bar
- Per-row checkbox selection with select-all in the header
- Color-coded severity badges with icons per level (info=blue, low=slate, medium=yellow, high=orange, critical=red, error=dark red)
- Category badges and source display
- Link click-through (checkbox area separate from link to prevent accidental navigation)
- Offset-based pagination via `PaginationControls` (50 items per page)
- Added to command palette (`src/components/CommandPalette.tsx`)

### Header Bell (`src/components/NotificationBell.tsx`)

- Dropdown filters to `medium`, `high`, `critical`, `error` levels only (defined in `BELL_VISIBLE_LEVELS`)
- Color-coded dots by severity level next to each notification title
- Unread count badge (max "9+") on the bell icon
- "View all notifications" link at the bottom leading to `/notifications`
- Polls every 10s via `useNotifications` hook (`src/hooks/useNotifications.ts`)
- New notifications trigger sonner toasts

### Browser Polling (`src/hooks/useNotifications.ts`)

- `useNotifications()` hook polls `getUnreadNotifications` server function every 10s
- Returns unread count and notification list with `level` and `category` fields
- On new notifications (comparing IDs), triggers callback for toast display

### Dashboard Widget (`src/components/dashboard/NotificationWidget.tsx`)

- Registered in `src/lib/dashboard/widget-registry.ts` as `notifications` widget
- Shows up to 8 recent notifications with severity-colored icons
- Unread count badge in the header
- Per-level count badges (e.g. "2 Critical, 5 High") linking to `/notifications?level=<level>`
- Individual notification click-through to their link
- "View all" link to `/notifications`
- Data loaded via `getDashboardData()` in `src/lib/dashboard.functions.ts` (grouped unread counts + recent items)

### Run Highlight (`?highlight=<threadId>`)

Task and workflow detail pages accept a `highlight` search param:
- **Routes:** `src/routes/tasks/$.tsx`, `src/routes/workflows/$.tsx` — read `highlight` from search params
- **Components:** `src/components/tasks/TaskRunHistory.tsx`, `src/components/workflows/WorkflowRunHistory.tsx` — pass through to `RunHistoryTable`
- **RunHistoryTable** (`src/components/shared/RunHistoryTable.tsx`) — accepts `highlightId` prop, auto-expands and applies teal-subtle background to the matching row

### AI Notify Tool (`src/lib/tools/send-notification.ts`)

- Registered as `send_notification` tool in `src/lib/ai-tools.ts`
- Parameters: `title`, `body?`, `link?`, `level` (default `low`), `pushToPhone` (default `false`), `scheduledAt?`, `timezone?`
- Category is always `"ai"`
- Claude should only use this when the user explicitly asks or something genuinely important comes up
- Logs an `ai_notification` entry (immediate) or `ai_notification_scheduled` entry (future) to `activityLog`
- When `scheduledAt` is omitted, notification is delivered immediately via `notify()`
- When `scheduledAt` is provided, a `ScheduledNotification` row is created:
  - If `scheduledAt` has an explicit offset (e.g. `...Z` or `+02:00`), it's parsed as-is
  - Otherwise the `timezone` parameter (or user's current timezone) is used to interpret the string
  - Past times are delivered immediately instead of being scheduled
  - Returns `{ id, scheduledAt, scheduledAtLocal, timezone }` so the AI can confirm the time back to the user

### AI Scheduled Notification Tools (`src/lib/tools/scheduled-notifications.ts`)

Two companion tools let the AI manage what it scheduled:

- **`list_scheduled_notifications`** — lists upcoming (pending) scheduled notifications for the current user. Parameters: `limit` (default 25), `includeCompleted` (default false) to also return sent/cancelled/failed. Returns id, title, scheduled time (ISO + local), timezone, status, and attempt info. Used when the user asks "what reminders do I have" or before cancelling one.
- **`cancel_scheduled_notification`** — cancels an upcoming notification by id. Only pending notifications can be cancelled. Sets status to `cancelled`, records `cancelledAt`, and logs an `ai_notification_cancelled` activity entry.

### Scheduled Notification Worker (`src/lib/scheduled-notifications-worker.ts`)

Background worker that delivers due scheduled notifications. Registered as the `scheduled-notifications` system task in `src/lib/system-tasks.ts` and runs every minute. Also runs once at startup to catch up on anything that came due while the server was offline.

**Fault tolerance:**
- Selects up to 50 `pending` rows whose `scheduledAt <= now()`
- "Claims" each row with a conditional update (`updateMany` where status is still `pending`) so two concurrent workers can't double-deliver
- On each attempt increments `attempts`
- On success: calls `notify()` with the stored fields, sets `status=sent`, records `sentAt` and the resulting `notificationId`
- On failure: records `lastError`; if `attempts < 5` leaves status as `pending` for the next tick to retry; otherwise marks `status=failed`
- Rows delivered more than 24 hours after their original scheduled time log a `warn` line noting how stale they were

### Scheduled Notifications Page (`/scheduled-notifications`)

**Route:** `src/routes/scheduled-notifications.tsx`
**Server functions:** `src/lib/scheduled-notifications.functions.ts`

- Listed under the header **System** dropdown and in the command palette
- Status filter (Pending / Sent / Cancelled / Failed / All) via search param
- Table of title, level, scheduled time (rendered in each row's stored timezone with relative "in 3 hours" hint), status badge, and a Cancel button for pending rows
- Counts summary (pending / sent / cancelled / failed) across all of the current user's scheduled notifications
- Cancel action calls the `cancelScheduledNotification` server function, then invalidates the route loader

### Pushover Integration (`src/lib/pushover.ts`)

- Simple HTTP POST to `https://api.pushover.net/1/messages.json`
- Fields: `token` (app), `user` (from preferences), `title`, `message`, `url`, `url_title`
- Test send available at `/settings/notifications` via `testPushoverNotification` server function
- Gracefully handles failures (log warning, don't throw)

### Notification Cleanup (System Task)

- Daily at 3 AM (`0 3 * * *`) via `src/lib/system-tasks.ts`
- Deletes read notifications older than 30 days
- Unread notifications persist until read

## Future Enhancements

| Feature | Notes |
| --- | --- |
| Mute/snooze per source | Temporarily silence notifications from a specific task or workflow |
| Quiet hours | Suppress push notifications during configured time windows |
| Digest mode | Batch low/medium notifications into periodic summary pushes |
| Email notifications | Send notifications via email (requires email infrastructure) |
| Notification templates | Structured title/body templates for tasks and workflows |
| System-level notification UI | Dedicated surface for system errors beyond the notification feed |
| Notification grouping | Collapse repeated notifications from the same source |
| Dashboard quick actions | Mark as read / dismiss directly from the dashboard widget |

## Change Log

- 2026-03-16: Initial requirements — basic notification model, Pushover integration, browser polling, header bell, AI notify tool.
- 2026-03-22: Updated to match v1 implementation — corrected routes, added test Pushover, documented NotificationLevel type, per-task/workflow notification config.
- 2026-04-03: Major expansion — six severity levels (info/low/medium/high/critical/error), full-page `/notifications` management with filters and bulk actions, header bell filtering to medium+, per-user push level preferences, dashboard widget with level counts, AI tool level parameter (default low), deep-link to specific task/workflow runs with highlight, multi-user targeting via `notifyUsers` frontmatter. Deferred: mute/snooze, quiet hours, digest, email, templates, grouping.
- 2026-04-08: Added scheduled notifications — new `ScheduledNotification` model, `send_notification` tool gained `scheduledAt` + `timezone` params, new `list_scheduled_notifications` and `cancel_scheduled_notification` AI tools, per-minute worker that fault-tolerantly delivers anything past its scheduled time (with startup catch-up), and a `/scheduled-notifications` page listed under the System nav for viewing and cancelling them.
