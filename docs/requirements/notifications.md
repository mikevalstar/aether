---
title: Notifications
status: in-progress
owner: self
last_updated: 2026-04-03
canonical_file: docs/requirements/notifications.md
canonical_file: docs/requirements/notifications.md
---

# Notifications

## Purpose

- Problem: Notifications are flat — no way to distinguish between a minor info message and a critical failure. No full-page management, no filtering, no categorization. The header dropdown is the only way to see notifications. Tasks and workflows can't target specific users or control notification severity.
- Outcome: A categorized notification system with levels (info, error, low, medium, high, critical), full-page management UI with bulk actions, per-user push notification preferences by level, and a dashboard widget. Tasks and workflows gain frontmatter to control notification targeting and severity.
- Notes: Single-user app today, but the system is built multi-user-ready (notifications target users by email). Admin-only levels (error) reserved for system diagnostics.

## Current Reality

- Current behavior: Notifications exist with a simple model (title, body, link, read, pushToPhone). The header bell shows recent notifications in a dropdown. Pushover integration works for push. Tasks/workflows have a `notification` field (`silent`/`notify`/`push`) controlling delivery channel.
- Constraints: SQLite backend, no WebSocket infrastructure. Pushover for push notifications.
- Non-goals (this version): Email notifications, mute/snooze per source, quiet hours, digest mode, notification templates, system-level notification UI.

## Environment Variables

| Variable | Purpose | Example |
| --- | --- | --- |
| `PUSHOVER_APP_TOKEN` | Pushover application API token | `azGDORePK8gMaC0QOYAMyEEuzJnyUi` |
| `APP_URL` | Base URL for clickable links in push notifications | `https://aether.example.com` |

## Notification Levels

| Level | Severity | Description | Shown in header bell? | Default push? |
| --- | --- | --- | --- | --- |
| `info` | 0 | Informational — routine completions, status updates | No | No |
| `low` | 1 | Low priority — minor items worth noting | No | No |
| `medium` | 2 | Medium priority — notable events that deserve attention | Yes | No |
| `high` | 3 | High priority — important events requiring timely attention | Yes | No |
| `critical` | 4 | Critical — failures, urgent issues requiring immediate action | Yes | Yes |
| `error` | 5 | System errors — admin-only, internal diagnostics | Yes (admin only) | Yes |

- Default level is `info` when not specified.
- The header bell notification dropdown only shows `medium`, `high`, `critical`, and `error` (error for admins only).
- The full notification page shows all levels with filtering.

## User Preferences

| Preference | Storage | Notes |
| --- | --- | --- |
| `pushoverUserKey` | `preferences` JSON on User | Pushover user key. When blank, push disabled. |
| `pushNotificationMinLevel` | `preferences` JSON on User | Minimum level to trigger a push notification. Default: `critical`. Options: `info`, `low`, `medium`, `high`, `critical`. |

## Data Model

### Notification (updated)

```prisma
model Notification {
  id           String    @id @default(cuid())
  title        String
  body         String?
  link         String?
  level        String    @default("info")    // info, low, medium, high, critical, error
  category     String?                       // source category: "task", "workflow", "ai", "system"
  source       String?                       // specific source identifier, e.g. task filename
  read         Boolean   @default(false)
  archived     Boolean   @default(false)
  pushToPhone  Boolean   @default(false)
  pushedAt     DateTime?
  createdAt    DateTime  @default(now())
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, read, createdAt])
  @@index([userId, archived, level, createdAt])
}
```

**Changes from current model:**
- Added `level` — notification severity (`info`, `low`, `medium`, `high`, `critical`, `error`)
- Added `category` — source type for filtering (`task`, `workflow`, `ai`, `system`)
- Added `source` — specific source identifier (e.g., task filename, workflow name)
- Added `archived` — separate from read; archived notifications are hidden from default views
- New composite index on `(userId, archived, level, createdAt)` for efficient filtered queries

### NotificationLevel type (updated)

Replace the existing `NotificationLevel` type (`"silent" | "notify" | "push"`) in `src/lib/notify.ts`:

```typescript
// Notification severity levels
export type NotificationSeverity = "info" | "low" | "medium" | "high" | "critical" | "error";

// Delivery behavior (replaces old NotificationLevel)
export type NotificationDelivery = "silent" | "notify" | "push";
```

The old `NotificationLevel` (`silent`/`notify`/`push`) becomes `NotificationDelivery` and controls the delivery channel. The new `NotificationSeverity` controls the importance level of the notification content. Both concepts coexist:
- `NotificationDelivery` — whether to create a notification at all and whether to push (used in task/workflow frontmatter)
- `NotificationSeverity` — how important the notification is (determines visibility in header, push eligibility based on user prefs)

## Task & Workflow Frontmatter Changes

### New frontmatter fields

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `notification` | string | `notify` | Delivery behavior: `silent`, `notify`, `push` (unchanged) |
| `notificationLevel` | string | `info` | Severity level: `info`, `low`, `medium`, `high`, `critical` |
| `notifyUsers` | string[] | `["all"]` | Email addresses of users to notify. `"all"` means all users. |
| `pushMessage` | boolean | `false` | Force push notification regardless of user preference level |

**Example task frontmatter:**
```yaml
---
title: Daily Summary
cron: "0 8 * * *"
model: claude-haiku-4-5
notification: notify
notificationLevel: medium
notifyUsers:
  - all
pushMessage: false
---
```

**Example workflow frontmatter:**
```yaml
---
title: URL to Recipe
notification: notify
notificationLevel: low
notifyUsers:
  - mike@example.com
pushMessage: false
fields:
  - name: url
    label: Recipe URL
    type: url
---
```

### Push notification logic

Push is sent when ANY of these conditions is true (and delivery is not `silent`):
1. `pushMessage: true` in the frontmatter (force push)
2. `notification: push` in the frontmatter (legacy behavior)
3. The notification's `level` meets or exceeds the user's `pushNotificationMinLevel` preference
4. Task/workflow failure (always pushes, unless `notification: silent`)

## Major Requirements

### Phase 1: Data Model & Core (schema + notify utility updates)

| Area | Status | Requirement |
| --- | --- | --- |
| Schema migration | done | Add `level`, `category`, `source`, `archived` columns to Notification model |
| Notify utility update | done | Update `notify()` to accept `level`, `category`, `source`; implement push logic based on user preference level |
| NotificationSeverity type | done | New severity type + validation, rename old NotificationLevel to NotificationDelivery |
| Task/workflow frontmatter | done | Add `notificationLevel`, `notifyUsers`, `pushMessage` to task and workflow validators and executors |
| Backward compat | done | Default existing notifications to `info` level; existing task/workflow `notification` field continues to work |

### Phase 2: Full Page Notifications Management

| Area | Status | Requirement |
| --- | --- | --- |
| Notifications page | done | Full page at `/notifications` with filterable, sortable notification list |
| Filters | done | Filter by level, category, read/unread/archived status via dropdowns and toggle buttons |
| Bulk actions | done | Select multiple: mark read, mark unread, archive, delete |
| Individual actions | done | Click-through to link; bulk actions cover mark read/unread, archive, delete |
| Level badges | done | Color-coded severity badges with icons on each notification |
| Pagination | done | Offset-based pagination via `PaginationControls` component |
| Command palette | done | Add `/notifications` to command palette |

### Phase 3: Header Bell Update

| Area | Status | Requirement |
| --- | --- | --- |
| Filtered bell | done | Header bell only shows medium, high, critical, error in dropdown |
| Level indicators | done | Color-coded dots by level in the dropdown |
| Link to full page | done | "View all notifications" link at bottom of dropdown leading to `/notifications` |

### Phase 4: User Preference — Push Level

| Area | Status | Requirement |
| --- | --- | --- |
| Push level setting | done | Add `pushNotificationMinLevel` dropdown to `/settings/notifications` |
| Push logic | done | `notify()` checks user's min level preference before sending push |

### Phase 5: Dashboard Widget

| Area | Status | Requirement |
| --- | --- | --- |
| Notification widget | todo | Dashboard widget showing recent notifications grouped by level |
| Count badges | todo | Count badges by level (e.g., "2 critical, 5 high") |
| Quick actions | todo | Mark as read / dismiss directly from the widget |
| Link through | todo | Click notification to navigate to its link, or to full notifications page |

### Phase 6: AI Notify Tool Update

| Area | Status | Requirement |
| --- | --- | --- |
| Level parameter | done | Add `level` parameter to the `send_notification` AI tool |
| Default behavior | done | AI tool defaults to `info` level; Claude can choose higher levels for urgent findings |

## Previously Implemented (v1)

These features from the original implementation remain and are being enhanced:

| Area | Status | Notes |
| --- | --- | --- |
| Notification DB model | done | Being extended with new columns |
| Notify utility | done | Being extended with level/category/source |
| Pushover integration | done | Push logic being enhanced with level-based preferences |
| Browser polling | done | Unchanged — polls every 10s |
| Toast display | done | Unchanged — toasts on new notifications |
| Notification bell | done | Being updated to filter by level |
| Mark as read | done | Unchanged |
| Preferences: Pushover key | done | Being extended with push level preference |
| AI notify tool | done | Being extended with level parameter |
| Test Pushover | done | Unchanged |

## Notification Sources

| Source | Event | Default Level | Category | Push behavior |
| --- | --- | --- | --- | --- |
| Periodic tasks | Task completed | Configurable via `notificationLevel` (default: `info`) | `task` | Per frontmatter + user pref |
| Periodic tasks | Task failed | `critical` | `task` | Always (unless `silent`) |
| Workflows | Workflow completed | Configurable via `notificationLevel` (default: `info`) | `workflow` | Per frontmatter + user pref |
| Workflows | Workflow failed | `critical` | `workflow` | Always (unless `silent`) |
| AI chat tool | Claude sends notification | Configurable per call (default: `info`) | `ai` | Per call + user pref |
| System | Future system diagnostics | `error` | `system` | Always |

## Future Enhancements

Items explicitly deferred for later versions:

| Feature | Notes |
| --- | --- |
| Mute/snooze per source | Temporarily silence notifications from a specific task or workflow |
| Quiet hours | Suppress push notifications during configured time windows |
| Digest mode | Batch low/medium notifications into periodic summary pushes |
| Email notifications | Send notifications via email (requires email infrastructure) |
| Notification templates | Structured title/body templates for tasks and workflows |
| System-level notification UI | Dedicated surface for system errors beyond the notification feed |
| Notification grouping | Collapse repeated notifications from the same source |

## Implementation Plan

| Step | Phase | Status | Plan |
| --- | --- | --- | --- |
| 1. Schema migration | 1 | done | Add `level`, `category`, `source`, `archived` to Notification model. Run `pnpm db:push`. |
| 2. Type updates | 1 | done | Create `NotificationSeverity` type, rename `NotificationLevel` to `NotificationDelivery`, update all imports. |
| 3. Notify utility | 1 | done | Update `notify()` signature and push logic to use severity levels and user preferences. |
| 4. Task/workflow validators | 1 | done | Add `notificationLevel`, `notifyUsers`, `pushMessage` to task and workflow zod validators. |
| 5. Task/workflow executors | 1 | done | Update task and workflow execution to pass new fields to `notify()`. |
| 6. Notifications page | 2 | done | Create `/notifications` route with server functions, filters, bulk actions, pagination. |
| 7. Header bell update | 3 | done | Filter bell dropdown to medium+ levels, add level badges, link to full page. |
| 8. Push level preference | 4 | done | Add `pushNotificationMinLevel` to preferences type, settings UI, and push logic. |
| 9. Dashboard widget | 5 | todo | Create notification dashboard widget with counts and quick actions. |
| 10. AI tool update | 6 | done | Add `level` parameter to `send_notification` tool. |

## Open Questions

None at this time.

## Change Log

- 2026-03-16: Initial requirements written.
- 2026-03-16: Resolved open questions — auto-dismiss after 30 days, header dropdown only, push is opt-in per source via `pushToPhone` flag. Added AI notify tool.
- 2026-03-22: Updated to match implementation — corrected preferences route, added test Pushover, documented NotificationLevel type, per-task/workflow notification config, pushToPhone DB field, activity log for AI notify, notification sources table.
- 2026-04-03: Major rewrite — notification categorization with severity levels (info, error, low, medium, high, critical), full-page management UI, bulk actions (mark read, archive, delete), filtering by level/category/source, task/workflow frontmatter for `notificationLevel`/`notifyUsers`/`pushMessage`, per-user push level preferences, dashboard widget, phased implementation plan. Deferred: mute/snooze, quiet hours, digest mode, email notifications, templates, grouping.
- 2026-04-03: Implemented phases 1–3 and 6 — schema migration, notify utility with severity/category/source, NotificationSeverity/NotificationDelivery types, task/workflow frontmatter updates, full `/notifications` page with filters/bulk actions/pagination, header bell filtering to medium+ with level dots and "view all" link, AI tool level parameter.
