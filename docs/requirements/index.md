---
title: Requirements Index
last_updated: 2026-03-15

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
| [System Settings](system-settings.md) | in-progress | AI config files in Obsidian with zod validation, real-time editor feedback, config library, seed/pull CLI scripts. | [system-settings](system-settings.md) | 2026-03-14 |
| [Activity Log](activity.md) | done | Generic activity log with file-change tracking (AI & manual), diff viewing, and revert. Extensible to future activity types. | [activity](activity.md) | 2026-03-15 |
| [User Preferences](user-preferences.md) | in-progress | Profile editing and app settings (Obsidian templates folder) at `/settings/preferences`. | [user-preferences](user-preferences.md) | 2026-03-15 |
| [AI Skills](skills.md) | todo | Markdown-based skill files in AI config that teach the AI specialized tasks via two-phase loading (summary + on-demand instructions). | [skills](skills.md) | 2026-03-15 |


# Ideas

Future ideas and things to build, but we don't have enough detail to write requirements for:

- Cards - cards in chat for obsidian items so that we can improve linking (also show activity?)
- Push Notifications - we'll need an integration for this probably.. hopefully an oss thing exists.. or its easy to hook into some system
- Jobs / Recurring tasks / Triggered Tasks - in the obsidian config folder
- Workflows - Define a form; form shows in the ui - it then runs the prompt as a background workflow
- Integrations - Calendars, Email?
- Important Files list - this might just be config
