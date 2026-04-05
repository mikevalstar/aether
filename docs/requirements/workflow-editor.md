---
title: Workflow Editor
status: done
owner: Mike
last_updated: 2026-04-05
canonical_file: docs/requirements/workflow-editor.md
---

# Workflow Editor

## Purpose

- Problem: Editing workflows means editing raw YAML frontmatter and markdown in Obsidian — the `fields` array is especially error-prone (nested YAML), placeholder mismatches are easy to introduce, and there's no validation feedback until the file watcher picks it up.
- Outcome: A dedicated `/workflows/editor` page reusing the same `ConfigEditorShell` as the task editor, with workflow-specific frontmatter display, a structured fields array editor, and a configure modal — so users get the same editing experience across tasks and workflows.
- Notes: Mirrors the task editor pattern exactly. The editor is an alternative UI to Obsidian, not a replacement. Uses the same `.md` files in `OBSIDIAN_DIR/OBSIDIAN_AI_CONFIG/workflows/`.

## Current Reality

- Workflows are fully implemented: file format, validation, execution pipeline, list UI at `/workflows`, form + run history at `/workflows/$filename`
- No `/workflows/editor` route exists — no way to edit workflow files from the web UI
- `ConfigEditorShell`, `ScopedTreeNav`, and all server functions (`getConfigEditorData`, `updateFrontmatterFields`, `createConfigFile`) are already reusable
- Task editor (Phases 1–3 done) provides the exact blueprint

## Non-goals

- Replacing the Obsidian editor — users can still edit workflow files there
- Changing how workflows execute or are triggered
- Editing task or trigger files (they use the same shell separately)
- Visual prompt template builder — the markdown body with `{{placeholders}}` is edited as plain markdown

## Architecture

### Reusing the Editor Shell

Same shared layout from `src/components/config-editor/`:

- **`ConfigEditorShell`** — two-column layout, view/edit toggle, Cmd+S save (no changes needed)
- **`ScopedTreeNav`** — file tree filtered to `workflows/` folder (no changes needed)
- **Server functions** — `getConfigEditorData`, `updateFrontmatterFields`, `toggleFrontmatterField`, `createConfigFile` (no changes needed)

Workflow-specific components to create:

- **`WorkflowFrontmatterDisplay`** — read-only frontmatter view with workflow-specific sections
- **`WorkflowFrontmatterModal`** — tabbed edit modal for workflow frontmatter
- **`NewWorkflowDialog`** — create new workflow file with defaults

### Routing

- `/workflows/editor` — workflow editor with left nav, defaults to empty state
- `/workflows/editor/$filename` — opens a specific workflow file; `?configure=true` auto-opens modal
- Edit button on `/workflows` cards links to `/workflows/editor/$filename`

### Workflow Frontmatter Schema (reference)

From the existing validator at `src/lib/ai-config/validators/workflow.ts`:

| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `title` | string | yes | — |
| `description` | string | no | — |
| `model` | string | no | `claude-haiku-4-5` |
| `effort` | `low` / `medium` / `high` | no | `low` |
| `maxTokens` | number | no | — |
| `notification` | `silent` / `notify` / `push` | no | `notify` |
| `notificationLevel` | `info` / `low` / `medium` / `high` / `critical` | no | `info` |
| `notifyUsers` | string[] | no | `["all"]` |
| `pushMessage` | boolean | no | `false` |
| `fields` | array | yes | — |

Each `fields` entry:

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `name` | string | yes | — |
| `label` | string | yes | — |
| `type` | `text` / `textarea` / `url` / `select` | no | `text` |
| `required` | boolean | no | `true` |
| `placeholder` | string | no | — |
| `options` | string[] | no | — |
| `default` | string | no | — |

## Sub-features

| Sub-feature | Phase | Status | Summary |
| --- | --- | --- | --- |
| Workflow frontmatter display | 1 | done | Sectioned read-only frontmatter view with tooltips |
| Edit button on `/workflows` cards | 1 | done | Link from workflow cards to `/workflows/editor/$filename` |
| Editor routes | 1 | done | `/workflows/editor` and `/workflows/editor/$filename` using ConfigEditorShell |
| Storybook stories | 1 | done | Stories for WorkflowFrontmatterDisplay and FieldsArrayEditor |
| Frontmatter edit modal | 2 | done | Tabbed modal for AI Config, Notifications, and Fields |
| Fields array editor | 2 | done | Reusable component with add/remove/reorder, bidirectional placeholder validation |
| New workflow dialog | 3 | done | Title + filename → create file with defaults → auto-open configure |

## Phase 1 — Editor + Frontmatter Display (done)

### Editor Routes

- `/workflows/editor/index.tsx` — mirrors task editor route
  - Loader: `getConfigEditorData({ data: { subfolder: "workflows" } })`
  - Renders `ConfigEditorShell` with `navLabel="Workflows"`, `basePath="/workflows/editor"`, workflow icon
  - Passes `WorkflowFrontmatterDisplay` via `renderFrontmatter`
  - Header action: "New" button (wired in Phase 3)
- `/workflows/editor/$.tsx` — dynamic file route, same pattern as tasks

### Workflow Frontmatter Display

Frontmatter rendered in grouped sections with "Configure" buttons (wired to modal in Phase 2):

| Section | Fields | Display notes |
| --- | --- | --- |
| AI Config | `model`, `effort`, `maxTokens` | Model shown with display name. Effort as badge. Max tokens only if set. |
| Notifications | `notification`, `notificationLevel`, `notifyUsers`, `pushMessage` | Notification mode as badge. Level as badge. User list. |
| Form Fields | `fields` array | Count of fields. Each field shown as: name, label, type badge, required indicator. |

- `description` shown at top if present, below the title
- Each field has a tooltip explaining what it does and valid values
- No quick toggle (workflows don't have an enabled/disabled state)

### Edit Button on Workflow Cards

- Add a pencil/edit icon button on each `WorkflowCard` in `/workflows`
- Links to `/workflows/editor/$filename`
- "Workflow Editor" added to `CommandPalette.tsx` PAGES array

## Phase 2 — Frontmatter Edit Modal (done)

### Modal Structure

- Triggered by "Configure" button on each frontmatter section
- Tabbed interface: AI Config, Notifications, Form Fields
- Opens to the relevant tab when clicking a section's configure button
- Each tab has an explainer help section
- Save applies changes to frontmatter and saves the file
- Cancel discards changes
- Stable height across tabs (`min-h-[420px]`)

### Field Editors

| Field | Editor type |
| --- | --- |
| `description` | Text input (shown in AI Config tab) |
| `model` | Dropdown of available models (resolves aliases) |
| `effort` | Radio card group: low / medium / high with token hints |
| `maxTokens` | Number input (optional, clears to unset) |
| `notification` | Dropdown: silent / notify / push |
| `notificationLevel` | Dropdown: info / low / medium / high / critical |
| `notifyUsers` | UserPicker — multi-select with search and "all" toggle |
| `pushMessage` | Toggle switch |

### Fields Array Editor

The unique piece — an editor for the `fields` array in the Form Fields tab:

- List of field definition rows, each expandable/collapsible
- **Add field** button appends a new empty field definition
- **Remove field** button on each row (with confirmation if field name is used in body)
- **Reorder** via styled up/down buttons
- Each field row edits:
  - `name` — text input, validated as unique identifier (alphanumeric + underscore)
  - `label` — text input
  - `type` — dropdown: text, textarea, url, select
  - `required` — toggle
  - `placeholder` — text input (optional)
  - `options` — comma-separated input, only shown when type is `select`
  - `default` — text input (optional)
- **Validation:**
  - Field names must be unique
  - Field names must be valid identifiers (no spaces/special chars)
  - `select` fields must have at least one option
  - Bidirectional placeholder validation: warn if a field name doesn't appear as `{{name}}` in the body, and warn if a `{{placeholder}}` in the body has no matching field
- At least one field is required

## Phase 3 — New Workflow Dialog (done)

### Flow

1. User clicks "New" button in the editor sidebar header
2. `NewWorkflowDialog` opens: enter title, auto-derive filename (kebab-case `.md`)
3. Allow manual filename override; shows preview path `workflows/filename.md`
4. On confirm, `createConfigFile` server function creates file with default frontmatter
5. Navigates to `/workflows/editor/$filename?configure=true`
6. Frontmatter configure modal auto-opens to Form Fields tab

### Defaults

- `model: "claude-haiku-4-5"`
- `effort: "low"`
- `notification: "notify"`
- `notificationLevel: "info"`
- `notifyUsers: ["all"]`
- `pushMessage: false`
- `fields: []` (empty — user adds fields in modal)

## Open Questions

None — all questions resolved.

### Resolved

- **Bidirectional placeholder validation:** Yes — the fields editor validates both directions: field names must appear as `{{name}}` in the body, and `{{placeholders}}` in the body must have matching field definitions.
- **Field reordering:** Up/down buttons (styled nicely), not drag-and-drop.
- **Form preview:** Not needed for now.

## Change Log

- 2026-04-05: Initial requirements document created — three phases defined, mirrors task editor pattern
- 2026-04-05: All three phases implemented. FieldsArrayEditor built as standalone reusable component with storybook.
