---
title: Task Editor
status: in-progress
owner: Mike
last_updated: 2026-04-06
canonical_file: docs/requirements/task-editor.md
---

# Task Editor

## Purpose

- Problem: Editing tasks currently means editing raw YAML frontmatter in the Obsidian editor — error-prone, no validation, no guidance on what fields mean or what values are valid.
- Outcome: A dedicated `/tasks/editor` page with a richer frontmatter display, visual cron builder, and structured modal for editing task config — reusable so workflows and triggers get the same editor shell later.
- Notes: The editor reuses the same `.md` files in `OBSIDIAN_DIR/OBSIDIAN_AI_CONFIG/tasks/`. It is an alternative UI to the Obsidian editor, not a replacement.

## Current Reality

- `/tasks/editor` and `/tasks/editor/$filename` routes live with reusable `ConfigEditorShell`
- Scoped tree nav shows only task files, with search and localStorage-persisted expansion
- Frontmatter displayed in sectioned view (Schedule, AI Config, Notifications) with tooltips and quick enable toggle
- Tabbed configure modal with visual cron builder, model/effort selectors, user picker, timezone with user preference suggestion
- New task creation via dialog with auto-derived kebab-case filename, auto-opens configure modal
- Edit button on `/tasks` table links to editor; "Task Editor" in command palette
- Markdown body editable with `@uiw/react-md-editor` (shared component)
- Storybook stories for all key components

## Non-goals

- Replacing the Obsidian editor — users can still edit task files there
- Editing non-task files (workflows/triggers use same shell later, not now)
- Changing how tasks execute or are scheduled

## Architecture

### Reusable Shell

Shared editor layout in `src/components/config-editor/`:

- **`ConfigEditorShell`**: Two-column layout (scoped tree nav + view/edit pane), view/edit toggle, save with Cmd+S
- **`ScopedTreeNav`**: File tree filtered to a specific folder, search, localStorage persistence, `headerAction` slot
- **`types.ts`**: `ScopedTreeNode`, `ConfigEditorData`, `ConfigEditorShellProps`

Each content type (task, workflow, trigger) provides:

- Its own frontmatter display component
- Its own frontmatter modal tab layout
- Its own "new file" defaults and dialog

### Server Functions (`src/lib/config-editor/config-editor.functions.ts`)

- `getConfigEditorData` — loads scoped tree + document + user timezone preference
- `toggleFrontmatterField` — toggle a single boolean field in frontmatter
- `updateFrontmatterFields` — update multiple frontmatter fields at once
- `createConfigFile` — create a new file with default frontmatter

### Routing

- `/tasks/editor` — task editor with left nav, defaults to empty state
- `/tasks/editor/$filename` — opens a specific task file; `?configure=true` auto-opens modal
- Edit button on `/tasks` table rows links to `/tasks/editor/$filename`

## Sub-features

| Sub-feature                   | Phase | Status | Summary                                                                             |
| ----------------------------- | ----- | ------ | ----------------------------------------------------------------------------------- |
| Reusable editor shell         | 1     | done   | Shared layout: scoped tree nav + frontmatter display + markdown editor              |
| Task frontmatter display      | 1     | done   | Sectioned, detailed, read-only frontmatter view with tooltips                       |
| Quick enable/disable toggle   | 1     | done   | Toggle task enabled state directly from the frontmatter display                     |
| Edit button on `/tasks` table | 1     | done   | Link from task table rows to `/tasks/editor/$filename`                              |
| Storybook stories             | 1     | done   | Stories for reusable shell, frontmatter display, scoped tree nav                    |
| Frontmatter edit modal        | 2     | done   | Tabbed modal for structured editing of all frontmatter fields                       |
| Visual cron builder           | 2     | done   | Dropdown-based cron editor with manual override option                              |
| User picker                   | 2     | done   | Reusable multi-select user picker with search, "all" toggle, avatars               |
| New task workflow             | 3     | done   | Modal-driven flow: set name (title + filename), auto-opens configure modal          |
| AI task critique              | 4     | todo   | AI reviews the markdown body and suggests improvements                              |

## Phase 1 — Editor + Frontmatter Display (done)

### Reusable Editor Shell

- `ConfigEditorShell`: two-column layout with scoped tree nav + editor pane
- `ScopedTreeNav`: filtered file tree with search, localStorage-persisted expansion, header action slot
- View/edit mode toggle with "Edit Prompt" button; save/cancel with Cmd+S support
- Key remounted on document change for clean state reset

### Task Frontmatter Display

Frontmatter rendered in grouped sections with "Configure" buttons (wired to modal in Phase 2):

| Section       | Fields                                                            | Display notes                                                                                                                    |
| ------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Schedule      | `cron`, `timezone`, `endDate`, `enabled`                          | Cron shown as human-readable + raw expression. Enabled as toggle (functional). End date formatted. |
| AI Config     | `model`, `effort`, `maxTokens`                                    | Model shown with display name. Effort as badge. Max tokens only if set.                                                          |
| Notifications | `notification`, `notificationLevel`, `notifyUsers`, `pushMessage` | Show notification status, level as badge, user list.                                                                             |

- Each field has a tooltip explaining what it does and valid values
- Quick toggle for `enabled` field — saves immediately on toggle

### Edit Button on Task Table

- Pencil icon button on each row in the `/tasks` table
- Links to `/tasks/editor/$filename`
- "Task Editor" added to `CommandPalette.tsx` PAGES array

## Phase 2 — Frontmatter Edit Modal (done)

### Modal Structure

- Triggered by "Configure" button on each frontmatter section
- Tabbed interface: Schedule, AI Config, Notifications
- Opens to the relevant tab when clicking a section's configure button
- Each tab has an explainer help section
- Save applies changes to frontmatter and saves the file
- Cancel discards changes
- Stable height across tabs (`min-h-[420px]`)

### Visual Cron Builder

- Dropdown-based UI: frequency (every minute / hourly / daily / weekly / monthly) + time inputs
- "Advanced" toggle reveals raw cron text input for manual editing
- Validates cron expression and shows next 3 run times as preview
- Timezone selector with grouped IANA timezones and user preference suggestion

### Field Editors

| Field               | Editor type                                              |
| ------------------- | -------------------------------------------------------- |
| `cron`              | Visual cron builder (see above)                          |
| `timezone`          | Grouped timezone dropdown with user preference suggestion|
| `endDate`           | Date picker with calendar popover                        |
| `enabled`           | Toggle switch                                            |
| `model`             | Dropdown of available models (resolves aliases)          |
| `effort`            | Radio card group: low / medium / high with token hints   |
| `maxTokens`         | Number input (optional, clears to unset)                 |
| `notification`      | Toggle (conditionally shows remaining fields)            |
| `notificationLevel` | Dropdown: info / warning / error                         |
| `notifyUsers`       | UserPicker — multi-select with search and "all" toggle   |
| `pushMessage`       | Toggle switch                                            |

### User Picker (`src/components/ui/user-picker.tsx`)

- Reusable Popover + Command (cmdk) multi-select
- "All users" toggle at top
- Individual user selection with avatar initials, name, email
- Smart all-detection: selecting every user switches to "all"
- Lazy-loads user list from DB on first open

## Phase 3 — New Task Workflow (done)

### Flow

1. User clicks "New" button in the editor sidebar header
2. `NewTaskDialog` opens: enter title, auto-derive filename (kebab-case `.md`)
3. Allow manual filename override; shows preview path `tasks/filename.md`
4. On confirm, `createConfigFile` server function creates file with default frontmatter
5. Navigates to `/tasks/editor/$filename?configure=true`
6. Frontmatter configure modal auto-opens to Schedule tab

### Defaults

- `enabled: false` (user enables after configuring)
- `cron: "0 9 * * *"` (daily at 9am)
- `model: "claude-haiku-4-5"`
- `effort: "low"`
- `notification: "silent"`

## Phase 4 — AI Task Critique (todo)

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
- 2026-04-05: Phases 1–3 implemented. Phase 4 deferred. Added UserPicker component. Status → in-progress.
