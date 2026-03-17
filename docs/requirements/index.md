---
title: Requirements Index
last_updated: 2026-03-17
canonical_file: docs/requirements/index.md
---

# Requirements Index

Status legend: `todo`, `in-progress`, `done`

| [Feature](index.md) | Status | Summary | File | Last updated |
| --- | --- | --- | --- | --- |
| [Authentication](auth.md) | in-progress | Invite-only auth with session-based access, admin-created accounts, and password rotation. | [auth](auth.md) | 2026-03-14 |
| [Chat](chat.md) | in-progress | Authenticated multi-thread Claude chat with streaming, tool inspection, and per-thread usage tracking. | [chat](chat.md) | 2026-03-14 |
| [Requirements Viewer](requirements-viewer.md) | done | Authenticated in-app viewer for requirement Markdown with index landing, linked docs, frontmatter-backed page chrome, and a left-hand file tree. | [requirements-viewer](requirements-viewer.md) | 2026-03-14 |
| [Usage](usage.md) | in-progress | Authenticated chat usage analytics with date/model filters, charts, and recent exchange history. | [usage](usage.md) | 2026-03-14 |
| [Obsidian](obsidian.md) | done | Obsidian vault browser with tree nav, title search, Markdown rendering/editing, and AI config section at `/o/$`. | [obsidian](obsidian.md) | 2026-03-14 |
| [System Settings](system-settings.md) | done | AI config files in Obsidian with zod validation, real-time editor feedback, config library, seed/pull CLI scripts. | [system-settings](system-settings.md) | 2026-03-14 |
| [Activity Log](activity.md) | done | Generic activity log with file-change tracking (AI & manual), diff viewing, and revert. Extensible to future activity types. | [activity](activity.md) | 2026-03-15 |
| [Logs Viewer](logs.md) | done | Authenticated daily log browser for rotated `./logs` files with day selection, server-side search/filtering, pagination, and raw JSON inspection. | [logs](logs.md) | 2026-03-17 |
| [User Preferences](user-preferences.md) | done | Profile editing and app settings (Obsidian templates folder) at `/settings/preferences`. | [user-preferences](user-preferences.md) | 2026-03-15 |
| [AI Skills](skills.md) | todo | Markdown-based skill files in AI config that teach the AI specialized tasks via two-phase loading (summary + on-demand instructions). | [skills](skills.md) | 2026-03-15 |
| [Periodic Tasks](periodic-tasks.md) | done | Cron-scheduled AI tasks defined as markdown in config `tasks/` folder, stored as ChatThread records, with list/history UI. | [periodic-tasks](periodic-tasks.md) | 2026-03-16 |
| [Workflows](workflows.md) | done | Form-based AI workflows defined as markdown in config `workflows/` folder, user-triggered via UI forms, background execution, convertible to chat. | [workflows](workflows.md) | 2026-03-16 |
| [System Tasks](system-tasks.md) | done | Code-defined maintenance cron jobs (cleanup stale records, etc.) — no UI, logs to activity only when acting. | [system-tasks](system-tasks.md) | 2026-03-16 |
| [Notifications](notifications.md) | done | Two-channel notifications: in-browser toasts (10s polling) + Pushover push to phone. Bell icon in header with unread count. | [notifications](notifications.md) | 2026-03-16 |
| [Command Palette](command-palette.md) | done | `Cmd+K` command palette for quick navigation to pages, workflows, obsidian docs, and common actions. Lazy-loaded data. | [command-palette](command-palette.md) | 2026-03-17 |
| [Calendar](calendar.md) | done | iCal feed sync with file cache, interactive month/day calendar widget on dashboard, and AI tool for date-range queries. | [calendar](calendar.md) | 2026-03-17 |
| [Board (Kanban)](board.md) | todo | Interactive kanban board backed by an Obsidian Kanban Markdown file, with AI tools for task management. | [board](board.md) | 2026-03-17 |


# Ideas

Future ideas and things to build, but we don't have enough detail to write requirements for:

- Cards - cards in chat for obsidian items so that we can improve linking (also show activity?)
- ~~Push Notifications~~ — promoted to [Notifications](notifications.md)
- ~~In-app Notification System~~ — promoted to [Notifications](notifications.md)
- ~~Jobs / Recurring tasks / Triggered Tasks~~ — promoted to [Periodic Tasks](periodic-tasks.md)
- ~~Workflows~~ — promoted to [Workflows](workflows.md)
- ~~Integrations - Calendars~~ — promoted to [Calendar](calendar.md)
- Integrations - Email?
- Important Files list - this might just be config
- https://exa.ai/ to get around AI blocking - would replace url markdown thing
