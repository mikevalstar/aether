---
title: Notifications
status: done
owner: self
last_updated: 2026-03-22
canonical_file: docs/requirements/notifications.md
---

# Notifications

## Purpose

- Problem: No way to know when background events happen (task completions, workflow results, failures) unless actively watching the app.
- Outcome: Two-channel notification system — in-browser toasts when the app is open, Pushover push notifications to phone when it's not (or always).
- Notes: Single-user app, so no complex subscription/preference matrix needed.

## Current Reality

- Current behavior: No notification system exists.
- Constraints: SQLite backend, no WebSocket infrastructure. Pushover requires a $5 one-time mobile app purchase.
- Non-goals: Email notifications, Web Push API / service workers, full `/notifications` history page (header dropdown only for now).

## Environment Variables

| Variable | Purpose | Example |
| --- | --- | --- |
| `PUSHOVER_APP_TOKEN` | Pushover application API token (create app at pushover.net) | `azGDORePK8gMaC0QOYAMyEEuzJnyUi` |
| `APP_URL` | Base URL of the app, used for clickable links in push notifications | `https://aether.example.com` |

## User Preferences

| Preference | Storage | Notes |
| --- | --- | --- |
| `pushoverUserKey` | `preferences` JSON column on User model | User's Pushover user key from their Pushover account. When blank, push notifications are disabled. Configured at `/settings/notifications`. |

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Notification model | done | Store notifications in SQLite for history and browser polling. |
| Server-side send utility | done | `src/lib/notify.ts` — creates DB record + optionally sends Pushover push. |
| In-browser polling | done | Poll every 10s for unread notifications, show toasts via sonner. |
| Pushover integration | done | POST to Pushover API when configured and `pushToPhone` flag is set. |
| Preferences UI | done | Add Pushover user key field to `/settings/notifications` with test send button. |
| Notification UI | done | Header bell icon with unread count badge, dropdown with auto-dismissing notifications. |
| AI notify tool | done | Chat tool that lets Claude send the user a notification (in-app + optional push). |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Notification DB model | done | Prisma model for notifications with title, body, link, read status, pushToPhone flag, timestamps. | Inline |
| Notify utility | done | Server function that writes to DB and optionally pushes to Pushover. | Inline |
| Notification levels | done | `NotificationLevel` type (`silent`, `notify`, `push`) used by tasks and workflows to control notification behavior. | Inline |
| Pushover client | done | HTTP POST to `https://api.pushover.net/1/messages.json` with app token, user key, message, URL. | Inline |
| Test Pushover | done | Server function + UI button to send a test push notification to verify Pushover configuration. | Inline |
| Browser polling | done | Client-side hook (`useNotifications`) polling server every 10s for unread notifications. | Inline |
| Toast display | done | New unread notifications trigger sonner toasts with title, message, and optional click-through link. | Inline |
| Notification bell | done | Header icon with unread count badge; click opens a popover of recent notifications. | Inline |
| Mark as read | done | Clicking a notification or "mark all read" updates the DB. | Inline |
| Preferences: Pushover key | done | Text input for Pushover user key on `/settings/notifications` with a help link to pushover.net and a test send button. | Inline |
| AI notify tool | done | AI chat tool so Claude can send notifications when asked or for important info. Logs to activity log. | Inline |

## Detail

### Notification DB model

- Fields: `id`, `userId`, `title`, `body` (optional), `link` (optional, relative app URL), `read` (boolean, default false), `pushToPhone` (boolean, default false), `pushedAt` (nullable, when Pushover was sent), `createdAt`.
- Index on `(userId, read, createdAt)` for efficient polling queries.

### Notify utility (`src/lib/notify.ts`)

- `notify({ userId, title, body?, link?, pushToPhone? })` — main entry point.
- Creates a Notification record in DB (including the `pushToPhone` flag).
- `pushToPhone` flag controls whether Pushover is sent (default `false`). Not all notifications justify a phone push.
- When `pushToPhone` is true, `PUSHOVER_APP_TOKEN` is set, and user has `pushoverUserKey`: sends Pushover push.
- Pushover message includes `url: APP_URL + link` so tapping the notification opens the right page.
- Gracefully handles Pushover failures (log warning, don't throw — the DB record is the source of truth).
- Exports `NotificationLevel` type (`"silent" | "notify" | "push"`) and `isNotificationLevel()` guard, used by task and workflow executors.

### Notification levels

- `NotificationLevel` = `"silent" | "notify" | "push"` — exported from `src/lib/notify.ts`.
- Tasks and workflows each have a `notification` frontmatter field (default: `notify`) that controls their notification behavior:
  - `silent` — no notification on completion or failure.
  - `notify` — in-app notification only.
  - `push` — in-app notification + Pushover push to phone.
- Task/workflow failures always push to phone regardless of the configured level (as long as `notification` is not `silent`).

### Browser polling

- `useNotifications()` hook polls `getUnreadNotifications` server function every 10s.
- Returns unread count and notification list.
- On new notifications (comparing IDs), triggers sonner toasts via a callback (`setOnNew`).
- Minimal payload: only fetch unread, limit to recent 20.

### Notification bell (header)

- Bell icon in the header (`src/components/NotificationBell.tsx`), included in `src/components/Header.tsx`.
- Badge shows unread count (hide badge when 0, caps display at "9+").
- Click opens a Popover with recent notifications (read + unread, last ~20) fetched via `getRecentNotifications`.
- Unread notifications highlighted with teal-subtle background; unread items shown with semibold title.
- Each item shows title, body (truncated to 2 lines), time ago, and wraps in a `<Link>` to `notification.link` if set.
- "Mark all as read" action at the top of the dropdown (only shown when there are unread notifications).
- Notifications auto-dismiss after 30 days — a system task cleans up old read notifications. Unread notifications persist until read.

### Pushover integration

- Simple HTTP POST, no SDK needed — `fetch()` to Pushover API via `src/lib/pushover.ts`.
- Fields sent: `token` (app), `user` (from preferences), `title`, `message`, `url`, `url_title`.
- Uses `URLSearchParams` for the request body.
- Priority: normal (0) by default. Callers opt-in to push via `pushToPhone` flag on `notify()`.

### Test Pushover

- `testPushoverNotification` server function in `src/lib/notifications.functions.ts`.
- Sends a test push ("Aether Test — Push notifications are working!") directly via `sendPushover()` without creating a DB record.
- Returns success/error status. UI button on `/settings/notifications` triggers this.

### AI notify tool

- Registered as `send_notification` tool in `src/lib/ai-tools.ts`, created via `createSendNotification()` in `src/lib/tools/send-notification.ts`.
- Parameters: `title` (string), `body` (optional string), `link` (optional string), `pushToPhone` (boolean, default false).
- Claude should only use this tool when the user explicitly asks to be notified/reminded, or when something genuinely important comes up (e.g., a critical finding during a task).
- The tool description emphasizes restraint — don't push to phone unless the user asked or the matter is urgent.
- Creates a notification via the same `notify()` utility.
- Logs an `ai_notification` entry to `activityLog` with title, body, link, and pushToPhone metadata.
- Available in all AI contexts: interactive chat, periodic tasks, and workflows.

## Notification Sources

These are the places that call `notify()`:

| Source | Event | Push to phone? |
| --- | --- | --- |
| Periodic tasks | Task run completed | Configurable per task via `notification` frontmatter (`silent`, `notify`, `push`) |
| Periodic tasks | Task run failed | Yes (always, unless `notification` is `silent`) |
| Workflows | Workflow execution completed | Configurable per workflow via `notification` frontmatter (`silent`, `notify`, `push`) |
| Workflows | Workflow execution failed | Yes (always, unless `notification` is `silent`) |
| AI chat tool | Claude sends a notification | Configurable per call (Claude decides based on importance) |

More sources can be added incrementally.

## Implementation Plan

| Step | Status | Plan |
| --- | --- | --- |
| 1. Schema | done | Add `Notification` model to `prisma/schema.prisma`. |
| 2. Env vars | done | Add `PUSHOVER_APP_TOKEN` and `APP_URL` to `.env.example`. |
| 3. Preferences | done | Add `pushoverUserKey` to `UserPreferences` type and `/settings/notifications` page UI. |
| 4. Pushover client | done | Create `src/lib/pushover.ts` — thin wrapper around the Pushover REST API. |
| 5. Notify utility | done | Create `src/lib/notify.ts` with `notify()` function and `NotificationLevel` type. |
| 6. Server functions | done | Create `src/lib/notifications.functions.ts` — getUnread, getRecent, markRead, markAllRead, testPushover. |
| 7. Polling hook | done | Create `src/hooks/useNotifications.ts` with 10s polling interval. |
| 8. Toast integration | done | Wire polling hook to sonner toasts for new notifications. |
| 9. Header bell | done | Add `NotificationBell` component + popover to `src/components/Header.tsx`. |
| 10. AI notify tool | done | Register `send_notification` tool in `src/lib/ai-tools.ts` via `src/lib/tools/send-notification.ts`. |
| 11. Wire up sources | done | Add `notify()` calls to periodic tasks and workflows with configurable notification levels. |
| 12. Cleanup system task | done | Add `cleanup-old-notifications` to system tasks (daily at 3 AM, delete read notifications older than 30 days). |

## Open Questions

None at this time.

## Change Log

- 2026-03-16: Initial requirements written.
- 2026-03-16: Resolved open questions — auto-dismiss after 30 days, header dropdown only, push is opt-in per source via `pushToPhone` flag. Added AI notify tool.
- 2026-03-22: Updated to match implementation — corrected preferences route to `/settings/notifications`, added test Pushover feature, documented `NotificationLevel` type and per-task/workflow notification configuration, added `pushToPhone` DB field, documented activity log entry for AI notify tool, corrected AI tool registration location, updated notification sources table with configurable levels.
