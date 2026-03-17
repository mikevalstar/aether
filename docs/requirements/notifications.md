---
title: Notifications
status: in-progress
owner: self
last_updated: 2026-03-16
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
| `pushoverUserKey` | `preferences` JSON column on User model | User's Pushover user key from their Pushover account. When blank, push notifications are disabled. Configured at `/settings/preferences`. |

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Notification model | done | Store notifications in SQLite for history and browser polling. |
| Server-side send utility | done | `src/lib/notify.ts` — creates DB record + optionally sends Pushover push. |
| In-browser polling | done | Poll every 10s for unread notifications, show toasts via sonner. |
| Pushover integration | done | POST to Pushover API when configured and `pushToPhone` flag is set. |
| Preferences UI | done | Add Pushover user key field to `/settings/preferences`. |
| Notification UI | done | Header bell icon with unread count badge, dropdown with auto-dismissing notifications. |
| AI notify tool | done | Chat tool that lets Claude send the user a notification (in-app + optional push). |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Notification DB model | done | Prisma model for notifications with title, body, link, read status, timestamps. | Inline |
| Notify utility | done | Server function that writes to DB and optionally pushes to Pushover. | Inline |
| Pushover client | done | HTTP POST to `https://api.pushover.net/1/messages.json` with app token, user key, message, URL. | Inline |
| Browser polling | done | Client-side hook (`useNotifications`) polling server every 10s for unread notifications. | Inline |
| Toast display | done | New unread notifications trigger sonner toasts with title, message, and optional click-through link. | Inline |
| Notification bell | done | Header icon with unread count badge; click opens a dropdown/panel of recent notifications. | Inline |
| Mark as read | done | Clicking a notification or "mark all read" updates the DB. | Inline |
| Preferences: Pushover key | done | Text input for Pushover user key on `/settings/preferences` with a help link to pushover.net. | Inline |
| AI notify tool | done | AI chat tool so Claude can send notifications when asked or for important info. | Inline |

## Detail

### Notification DB model

- Fields: `id`, `userId`, `title`, `body` (optional), `link` (optional, relative app URL), `read` (boolean), `pushedAt` (nullable, when Pushover was sent), `createdAt`.
- Index on `(userId, read, createdAt)` for efficient polling queries.

### Notify utility (`src/lib/notify.ts`)

- `notify({ userId, title, body?, link?, pushToPhone? })` — main entry point.
- Creates a Notification record in DB.
- `pushToPhone` flag controls whether Pushover is sent (default `false`). Not all notifications justify a phone push.
- When `pushToPhone` is true, `PUSHOVER_APP_TOKEN` is set, and user has `pushoverUserKey`: sends Pushover push.
- Pushover message includes `url: APP_URL + link` so tapping the notification opens the right page.
- Gracefully handles Pushover failures (log warning, don't throw — the DB record is the source of truth).

### Browser polling

- `useNotifications()` hook polls `getUnreadNotifications` server function every 10s.
- Returns unread count and notification list.
- On new notifications (comparing IDs), triggers sonner toasts.
- Minimal payload: only fetch unread, limit to recent 20.

### Notification bell (header)

- Bell icon in the header, next to user menu.
- Badge shows unread count (hide badge when 0).
- Click opens a dropdown with recent notifications (read + unread, last ~20).
- Each item shows title, time ago, and links to `notification.link` if set.
- "Mark all as read" action at the top of the dropdown.
- Notifications auto-dismiss after 30 days — a system task cleans up old read notifications. Unread notifications persist until read.

### Pushover integration

- Simple HTTP POST, no SDK needed — `fetch()` to Pushover API.
- Fields sent: `token` (app), `user` (from preferences), `title`, `message`, `url`, `url_title`.
- Priority: normal (0) by default. Callers opt-in to push via `pushToPhone` flag on `notify()`.

### AI notify tool

- Registered as a tool in the chat API endpoint, available to Claude during conversations.
- Parameters: `title` (string), `body` (optional string), `link` (optional string), `pushToPhone` (boolean, default false).
- Claude should only use this tool when the user explicitly asks to be notified/reminded, or when something genuinely important comes up (e.g., a critical finding during a task).
- The tool's system prompt instruction should emphasize restraint — don't push to phone unless the user asked or the matter is urgent.
- Creates a notification via the same `notify()` utility.
- Available in all AI contexts: interactive chat, periodic tasks, and workflows.

## Notification Sources (initial)

These are the places that will call `notify()` once the system is built:

| Source | Event | Push to phone? |
| --- | --- | --- |
| Periodic tasks | Task run failed | Yes |
| Periodic tasks | Task run completed | No (in-app only) |
| Workflows | Workflow execution completed | No (in-app only) |
| System tasks | Failure/error in a system task | Yes |
| AI chat tool | Claude sends a notification | Configurable per call (Claude decides based on importance) |

More sources can be added incrementally.

## Implementation Plan

| Step | Status | Plan |
| --- | --- | --- |
| 1. Schema | done | Add `Notification` model to `prisma/schema.prisma`. |
| 2. Env vars | done | Add `PUSHOVER_APP_TOKEN` and `APP_URL` to `.env.example`. |
| 3. Preferences | done | Add `pushoverUserKey` to `UserPreferences` type and preferences page UI. |
| 4. Pushover client | done | Create `src/lib/pushover.ts` — thin wrapper around the Pushover REST API. |
| 5. Notify utility | done | Create `src/lib/notify.ts` with `notify()` function. |
| 6. Server functions | done | Create `src/lib/notifications.functions.ts` — getUnread, markRead, markAllRead. |
| 7. Polling hook | done | Create `src/hooks/useNotifications.ts` with 10s polling interval. |
| 8. Toast integration | done | Wire polling hook to sonner toasts for new notifications. |
| 9. Header bell | done | Add notification bell + dropdown to `src/components/Header.tsx`. |
| 10. AI notify tool | done | Register `send_notification` tool in chat API endpoint. |
| 11. Wire up sources | todo | Add `notify()` calls to periodic tasks, workflows, system tasks. |
| 12. Cleanup system task | done | Add notification cleanup to system tasks (delete read notifications older than 30 days). |

## Open Questions

None at this time.

## Change Log

- 2026-03-16: Initial requirements written.
- 2026-03-16: Resolved open questions — auto-dismiss after 30 days, header dropdown only, push is opt-in per source via `pushToPhone` flag. Added AI notify tool.
