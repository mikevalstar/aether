---
title: Task Editor
status: todo
owner: Mike
last_updated: 2026-04-05
canonical_file: docs/requirements/task-editor.md
---

# Task Editor

## Purpose

- Problem: Editing tasks currently means editing raw YAML frontmatter in the Obsidian editor — error-prone, no validation, no guidance on what fields mean or what values are valid.
- Outcome: A dedicated `/tasks/editor` page with a richer frontmatter display, visual cron builder, and structured modal for editing task config — reusable so workflows and triggers get the same editor shell later.
- Notes: The editor reuses the same `.md` files in `OBSIDIAN_DIR/OBSIDIAN_AI_CONFIG/tasks/`. It is an alternative UI to the Obsidian editor, not a replacement.

## Current Reality

- Tasks are `.md` files with YAML frontmatter, edited via the generic Obsidian editor at `/o/$`
- Frontmatter displays as a flat key-value list with no grouping, tooltips, or validation
- `/tasks/` shows a table of tasks with cron, status, and run history — no link to edit
- The `MarkdownEditor` component (`@uiw/react-md-editor`) is shared and should stay shared
- Task files are parsed by `task-loader.ts` using `gray-matter`

## Non-goals

- Replacing the Obsidian editor — users can still edit task files there
- Editing non-task files (workflows/triggers use same shell later, not now)
- Changing how tasks execute or are scheduled

## Architecture

### Reusable Shell

Extract a shared editor layout component usable by tasks, workflows, and triggers:

- **Left nav**: Scoped file tree (like `ObsidianTreeNav` but filtered to a specific folder)
- **Right pane**: Frontmatter display (top) + markdown editor (bottom)
- **Modal shell**: Tabbed modal container for structured frontmatter editing
- **File operations**: Load, save, create — delegating to obsidian server functions

Each content type (task, workflow, trigger) provides:

- Its own frontmatter field definitions and tab layout
- Its own frontmatter display component
- Its own "new file" defaults

A Storybook story should exist for the reusable shell and key sub-components.

### Routing

- `/tasks/editor` — task editor with left nav, defaults to first task or empty state
- `/tasks/editor/$filename` — opens a specific task file
- Add "Edit" button to the `/tasks` table rows linking to `/tasks/editor/$filename`

## Sub-features

| Sub-feature                   | Phase | Status | Summary                                                                             |
| ----------------------------- | ----- | ------ | ----------------------------------------------------------------------------------- |
| Reusable editor shell         | 1     | todo   | Shared layout: scoped tree nav + frontmatter display + markdown editor              |
| Task frontmatter display      | 1     | todo   | Sectioned, detailed, read-only frontmatter view with tooltips                       |
| Quick enable/disable toggle   | 1     | todo   | Toggle task enabled state directly from the frontmatter display                     |
| Edit button on `/tasks` table | 1     | todo   | Link from task table rows to `/tasks/editor/$filename`                              |
| Storybook stories             | 1     | todo   | Stories for reusable shell, frontmatter display, scoped tree nav                    |
| Frontmatter edit modal        | 2     | todo   | Tabbed modal for structured editing of all frontmatter fields                       |
| Visual cron builder           | 2     | todo   | Dropdown-based cron editor with manual override option                              |
| New task workflow             | 3     | todo   | Modal-driven flow: set name (title + filename) then configure via frontmatter modal |
| AI task critique              | 4     | todo   | AI reviews the markdown body and suggests improvements                              |

## Phase 1 — Editor + Frontmatter Display

### Reusable Editor Shell

- Shared layout component: left nav (scoped tree) + right pane (frontmatter + editor)
- Left nav shows only files from the relevant folder (tasks → `tasks/`, later workflows → `workflows/`)
- Clicking a file in the nav loads it in the editor pane
- File save uses existing `saveObsidianDocument()` server function
- Storybook story with mock data

### Task Frontmatter Display

Render frontmatter in grouped sections instead of a flat list. Each section has a header and an "Edit" button (disabled in Phase 1, wired in Phase 2).

**Sections:**

| Section       | Fields                                                            | Display notes                                                                                                                    |
| ------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Schedule      | `cron`, `timezone`, `endDate`, `enabled`                          | Cron shown as human-readable (e.g. "Every day at 9:00 AM") + raw expression. Enabled as toggle (functional). End date formatted. |
| AI Config     | `model`, `effort`, `maxTokens`                                    | Model shown with display name. Effort as badge. Max tokens only if set.                                                          |
| Notifications | `notification`, `notificationLevel`, `notifyUsers`, `pushMessage` | Show notification status, level as badge, user list.                                                                             |

- Each field has a tooltip explaining what it does and valid values
- Quick toggle for `enabled` field — saves immediately on toggle
- Responsive: sections stack vertically on narrow viewports

### Edit Button on Task Table

- Add an "Edit" icon/button to each row in the `/tasks` table
- Links to `/tasks/editor/$filename`
- Update `CommandPalette.tsx` PAGES array for `/tasks/editor`

## Phase 2 — Frontmatter Edit Modal

### Modal Structure

- Triggered by "Edit" button on each frontmatter section, or an "Edit All" button
- Tabbed interface matching the three sections: Schedule, AI Config, Notifications
- Opens to the relevant tab when clicking a section's edit button
- Save applies changes to frontmatter and saves the file
- Cancel discards changes
- each tab will have an explainer help section about what these are modifying

### Visual Cron Builder

- Dropdown-based UI: frequency (every minute / hourly / daily / weekly / monthly) + time inputs
- Covers common patterns without needing to know cron syntax
- "Advanced" toggle reveals raw cron text input for manual editing
- Validates cron expression and shows next 3 run times as preview
- Timezone selector (dropdown of common timezones)

### Field Editors

| Field               | Editor type                                              |
| ------------------- | -------------------------------------------------------- |
| `cron`              | Visual cron builder (see above)                          |
| `timezone`          | Searchable timezone dropdown                             |
| `endDate`           | Date picker                                              |
| `enabled`           | Toggle switch                                            |
| `model`             | Dropdown of available models (from `chat-models.ts`)     |
| `effort`            | Radio group: low / medium / high with token budget hints |
| `maxTokens`         | Number input (optional, clears to unset)                 |
| `notification`      | Toggle                                                   |
| `notificationLevel` | Dropdown: info / warning / error                         |
| `notifyUsers`       | Multi-select of users                                    |
| `pushMessage`       | Text input                                               |

## Phase 3 — New Task Workflow

### Flow

1. User clicks "New Task" button (in left nav or task table)
2. Modal opens with a name step: enter title, auto-derive filename (kebab-case `.md`)
3. Allow manual filename override
4. On confirm, create file with default frontmatter and empty body
5. Open the file in the editor
6. Optionally open the frontmatter modal immediately to configure

### Defaults

- `enabled: false` (user enables after configuring)
- `cron: "0 9 * * *"` (daily at 9am)
- `model: "claude-haiku-4-5"`
- `effort: "low"`
- `notification: false`

## Phase 4 — AI Task Critique

### Behavior

- "Critique" button in the editor toolbar or frontmatter area
- AI reads the task's markdown body (the prompt/instructions portion)
- Provides feedback on clarity, completeness, and effectiveness of the prompt
- Shows a proposed revised version alongside the original
- User can accept the revision (replaces body), dismiss, or iterate

### Implementation

- Runs as its own AI prompt with tools (similar to task execution architecture)
- Creates a lightweight ChatThread record for the critique (type: `task-critique` or similar)
- Uses the user's selected model (or a sensible default)
- Tools available: all tools initially, may be scoped down later
- Does NOT evaluate or modify frontmatter — only the markdown body

## Open Questions

- Should the AI critique (Phase 4) show a diff view between original and proposed revision?
- Should the scoped tree nav show file status indicators (enabled/disabled, last run status)?
- Should the editor warn if a task's cron overlaps heavily with another task's schedule?

## Change Log

- 2026-04-05: Initial requirements document created — four phases defined
