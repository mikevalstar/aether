---
title: Requirements Index
last_updated: 2026-04-05
canonical_file: docs/requirements/index.md
---

# Requirements Index

Status legend: `todo`, `in-progress`, `done`

| [Feature](index.md) | Status | Summary | File | Last updated |
| --- | --- | --- | --- | --- |
| [Authentication](auth.md) | in-progress | Invite-only auth with session-based access, admin-created accounts, password rotation, and profile settings. | [auth](auth.md) | 2026-03-22 |
| [Chat](chat.md) | in-progress | Multi-model AI chat with streaming, threads, tool ecosystem (~20 tools), skills, @-mentions, effort levels, and export to Obsidian. | [chat](chat.md) | 2026-03-22 |
| [Requirements Viewer](requirements-viewer.md) | done | Authenticated in-app viewer for requirement Markdown with index landing, linked docs, frontmatter-backed page chrome, status badges, and a left-hand file tree. | [requirements-viewer](requirements-viewer.md) | 2026-03-22 |
| [Usage](usage.md) | in-progress | Chat usage analytics with date range picker, task type filter, stacked-by-model cost charts, and thread-linked exchange history. | [usage](usage.md) | 2026-03-22 |
| [Obsidian](obsidian.md) | done | Obsidian vault browser with tree nav, fuzzy search, Markdown rendering/editing, AI config validation, AI memory, @-mention autocomplete, and chat export at `/o/$`. | [obsidian](obsidian.md) | 2026-03-22 |
| [System Settings](system-settings.md) | done | AI config files in Obsidian with zod validation, real-time editor feedback, config library for prompts/tasks/workflows/skills, seed/pull CLI scripts. | [system-settings](system-settings.md) | 2026-03-22 |
| [Activity Log](activity.md) | done | Multi-type activity log (file changes, cron tasks, workflows, notifications, plugins) with diff viewing, revert, chat thread detail, and dashboard digest. | [activity](activity.md) | 2026-03-22 |
| [Logs Viewer](logs.md) | done | Authenticated daily log browser with calendar day picker, summary stat cards, server-side search/filtering, pagination, and raw JSON inspection. | [logs](logs.md) | 2026-03-22 |
| [User Preferences](user-preferences.md) | done | Multi-page settings layout (profile, chat, notifications, calendar, board, plugins) at `/settings/`. | [user-preferences](user-preferences.md) | 2026-03-22 |
| [AI Skills](skills.md) | done | Markdown-based skill files in AI config that teach the AI specialized tasks via two-phase loading (summary + on-demand `load_skill` tool). | [skills](skills.md) | 2026-03-22 |
| [Periodic Tasks](periodic-tasks.md) | done | Cron-scheduled AI tasks with timezone, notification control, run-now UI, stored as ChatThread records. | [periodic-tasks](periodic-tasks.md) | 2026-03-22 |
| [Workflows](workflows.md) | done | Form-based AI workflows with @-mention fields, notification control, command palette integration, background execution, convertible to chat. | [workflows](workflows.md) | 2026-03-22 |
| [System Tasks](system-tasks.md) | done | Code-defined maintenance cron jobs (cleanup stale records, cleanup old notifications, calendar sync). | [system-tasks](system-tasks.md) | 2026-03-22 |
| [Notifications](notifications.md) | done | Two-channel notifications (in-browser toasts + Pushover push) with configurable notification levels, test send, bell icon with unread count. | [notifications](notifications.md) | 2026-03-22 |
| [Command Palette](command-palette.md) | done | `Cmd+K` command palette for pages, workflows, obsidian search, plugin commands, and quick actions. Lazy-loaded data. | [command-palette](command-palette.md) | 2026-03-22 |
| [Calendar](calendar.md) | done | iCal feed sync with event detail dialogs, next-event countdown widget, meeting link extraction, keyboard nav, and AI tool. | [calendar](calendar.md) | 2026-03-22 |
| [Board (Kanban)](board.md) | done | Interactive kanban board with drag-and-drop, dashboard widget, activity logging, and AI tools for task management. | [board](board.md) | 2026-03-22 |
| [Plugin System](plugins.md) | done | Standardized plugin interface with dual-file registration, AI tools, settings, health checks, test connection, dashboard widgets, and command palette. | [plugins](plugins.md) | 2026-03-22 |
| [Plugin — Email (IMAP)](plugin-imap.md) | done | IMAP email plugin with six AI tools (list, read, search, folders, move, archive), dashboard inbox widget, and Proton Mail Bridge support. | [plugin-imap](plugin-imap.md) | 2026-03-28 |
| [Plugin — API Balances](plugin-api-balances.md) | done | Dashboard widget + AI tool showing credit balances for OpenRouter, OpenAI, Kilo Code. Per-service config with test connection and 10-min cache. | [plugin-api-balances](plugin-api-balances.md) | 2026-03-22 |
| [Plugin — Sonarr](plugin-sonarr.md) | done | Sonarr TV show management via AI tools (11 tools: list/get series, episodes, upcoming, queue, history, wanted, search/add, delete file, trigger search). JMESPath filtering. Phase 1 of *arr stack. | [plugin-sonarr](plugin-sonarr.md) | 2026-04-04 |
| [Plugin — Radarr](plugin-radarr.md) | todo | Radarr movie management via AI tools (10 tools: list/get movies, upcoming, queue, history, wanted, search/add, delete file, trigger search). JMESPath filtering. Phase 2 of *arr stack. | [plugin-radarr](plugin-radarr.md) | 2026-04-04 |
| [Task Editor](task-editor.md) | todo | Dedicated task file editor with sectioned frontmatter display, visual cron builder, structured edit modal, new-task workflow, and AI critique. Reusable shell for workflows/triggers. | [task-editor](task-editor.md) | 2026-04-05 |
| [Triggers](triggers.md) | draft | Event-driven AI prompts fired by file changes or plugin events. Config-as-markdown in `triggers/` folder, `{{details}}` placeholder, concurrent execution. | [triggers](triggers.md) | 2026-03-22 |
| [OpenRouter Model Browser](openrouter-models.md) | todo | Browse OpenRouter model catalog from chat settings, see pricing, enable/disable models for use in chat. | [openrouter-models](openrouter-models.md) | 2026-03-28 |


# Ideas

Future ideas and things to build, but we don't have enough detail to write requirements for:

- Cards - cards in chat for obsidian items so that we can improve linking (also show activity?)
- ~~Push Notifications~~ — promoted to [Notifications](notifications.md)
- ~~In-app Notification System~~ — promoted to [Notifications](notifications.md)
- ~~Jobs / Recurring tasks / Triggered Tasks~~ — promoted to [Periodic Tasks](periodic-tasks.md)
- ~~Workflows~~ — promoted to [Workflows](workflows.md)
- ~~Integrations - Calendars~~ — promoted to [Calendar](calendar.md)
- ~~Exa AI~~ — integrated as an MCP server for web search / content fetching
- Email sending — AI tool to send emails (SMTP). Draft-first workflow: AI composes a draft, user reviews/approves before send. Read-only IMAP monitoring can come later as a plugin.
- Approval Gate — top-level feature where the AI (or plugins) can queue actions that require user approval before execution. The AI is aware of pending approvals and can reference them in conversation. Surfaces in notifications and a dedicated UI. Key security differentiator.
- Instant Messaging — IM channel support so the AI can be reached via messaging apps (Telegram, Discord, Slack, etc.). Start with one, expand to many.
- AI Memory — structured, persistent memory system backed by Obsidian markdown files. The AI builds knowledge about the user over time. Fully transparent and auditable — every memory is a readable/editable/deletable markdown file.
- Smart Home Integration — Home Assistant / MQTT plugin for controlling and monitoring smart home devices via AI tools.
- Web Access / Browsing — AI tool for fetching and parsing web pages, extracting structured data, monitoring changes. Scoped read-access (not full browser automation) to keep the attack surface small.
- Webhook Receiver — authenticated inbound webhook endpoint that triggers AI workflows. Enables external integrations (GitHub push → summarize changes, Sentry alert → investigate) without building per-platform adapters.
- Conversation Branching — extend existing branch navigation into explicit fork/branch workflows. Explore multiple approaches in parallel from a single conversation point. Leverage the web UI advantage over messaging-app-based assistants.
- Important Files list - this might just be config
- Tools to access previous chats ... maybe a job to create and manage memories? (dreams)

# Larger Initiatives

These are bigger architectural efforts that will need full requirements docs before starting:

- **Multi-user support** — move Obsidian vault/folder settings from global config to per-user preferences so multiple users can have their own vault, AI config, and memory. Primary motivation: allow separate setups for different household members.
- **System settings migration** — move configuration currently in `.env` (API keys, SMTP credentials, etc.) into in-app global system settings. Requires an encrypted secrets vault for storing passwords and API keys securely — not plaintext in the database.
