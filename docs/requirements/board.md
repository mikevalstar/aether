---
title: Board (Kanban)
status: todo
owner: self
last_updated: 2026-03-17
canonical_file: docs/requirements/board.md
---

# Board (Kanban)

## Purpose

- Problem: No way to manage tasks/to-dos inside Aether. Task lists live in Obsidian kanban files but aren't surfaced in the dashboard.
- Outcome: A `/board` page that reads an Obsidian Kanban-format Markdown file and renders a full interactive kanban board with add/remove/move. AI can also query and modify tasks via dedicated tools.
- Notes: The board operates directly on the Obsidian Markdown file — no database models. The file format follows the Obsidian Kanban plugin conventions.

## File Format

The kanban file is standard Markdown with Obsidian Kanban plugin conventions:

- Frontmatter: `kanban-plugin: board`
- Columns: `## Heading` — each H2 is a column
- Tasks: `- [ ] Task text` (open) or `- [x] Task text` (completed/archived)
- Archive: `## Archive` section contains completed items with `✅ YYYY-MM-DD` — **hidden from UI**
- Footer: `%% kanban:settings` block with JSON config — preserved on write

## Configuration

- **User preference**: `kanbanFile` field in the `UserPreferences` JSON on the User model.
- Configured at `/settings/preferences` using a searchable combobox (vault file picker via fuzzy search, filtering to `.md` files).
- When no file is configured, `/board` shows an empty state directing the user to preferences.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Board page | todo | `/board` route showing kanban columns parsed from the configured Obsidian Markdown file. |
| Dynamic columns | todo | Columns derived from `##` headings in the file. Order matches file order. |
| Add task | todo | Add a new task to any column. |
| Remove task | todo | Delete a task from any column. |
| Move task | todo | Move a task between columns (change status). |
| File picker preference | todo | Searchable combobox in user preferences to select the kanban file from the Obsidian vault. |
| AI tools | todo | Dedicated tools for the AI to list tasks, add tasks, and update/move tasks. |
| Command palette | todo | Add "Board" to the `PAGES` array in `CommandPalette.tsx`. |
| Header nav | todo | Add "Board" link to authenticated header navigation. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Kanban file parser | todo | Parse the Obsidian Kanban Markdown format into structured columns + tasks. | [Detail](#kanban-file-parser) |
| Kanban file serializer | todo | Serialize structured data back to valid Obsidian Kanban Markdown, preserving frontmatter and settings footer. | [Detail](#kanban-file-serializer) |
| Board UI | todo | Interactive kanban board with columns, task cards, and drag-or-button-based movement. | [Detail](#board-ui) |
| Empty/unconfigured state | todo | Friendly state when no kanban file is selected, with link to preferences. | Inline |
| Preference: kanban file picker | todo | Searchable combobox in `/settings/preferences` for selecting the kanban `.md` file. | [Detail](#kanban-file-picker) |
| AI tool: `board_list_tasks` | todo | List all tasks with their column/status, optional column filter. | [Detail](#ai-tools) |
| AI tool: `board_add_task` | todo | Add a new task to a specified column. | [Detail](#ai-tools) |
| AI tool: `board_update_task` | todo | Update task text or move to a different column. | [Detail](#ai-tools) |

## Detail

### Kanban file parser

- Read the configured file via existing Obsidian server functions.
- Parse `##` headings as column names.
- Parse `- [ ]` and `- [x]` items as tasks within each column.
- Skip the `## Archive` section entirely — do not include archived items in the parsed output.
- Preserve the raw frontmatter and `%% kanban:settings` footer for round-tripping.

### Kanban file serializer

- Reconstruct the Markdown file from structured column/task data.
- Preserve original frontmatter block.
- Write columns as `## Heading` with tasks as `- [ ] Text` lines.
- Append the original `## Archive` section unchanged (read it raw during parse, write it back verbatim).
- Append the original `%% kanban:settings` footer unchanged.

### Board UI

- Each column rendered as a vertical lane with the `##` heading as the column title.
- Tasks shown as cards/items within each column.
- **Add**: Input/button at the bottom of each column to add a new task.
- **Remove**: Delete button/icon on each task card.
- **Move**: Drag-and-drop between columns and reorder within a column.
- All mutations save back to the file immediately via server functions.
- Columns and column management (add/remove/rename) are not editable from the board UI — managed by editing the file directly in Obsidian or the vault browser.
- Responsive: columns should scroll horizontally if they overflow.

### Kanban file picker

- Added to the Obsidian section of `/settings/preferences`.
- Uses a searchable combobox component (similar pattern to existing vault folder picker but searching files).
- Searches `.md` files in the vault, ideally leveraging the existing vault index / fuzzy search.
- Stores the selected file's relative path in `UserPreferences.kanbanFile`.

### AI tools

Three dedicated tools registered alongside existing chat tools:

**`board_list_tasks`**
- Parameters: optional `column` filter (string).
- Returns: all tasks grouped by column with their text and checked status.
- Skips the Archive section.

**`board_add_task`**
- Parameters: `task` (string, required), `column` (string, required).
- Adds a `- [ ] task` line to the specified column.
- Returns confirmation with the updated column.

**`board_update_task`**
- Parameters: `task` (string, required — existing task text to match), `newText` (string, optional — updated text), `newColumn` (string, optional — column to move to).
- Finds the task by text match, updates text and/or moves to new column.
- Returns confirmation with what changed.

All tools read/write the kanban file configured in the current user's preferences.

## Implementation Plan

| Step | Status | Plan |
| --- | --- | --- |
| 1. Parser/serializer | todo | Create `src/lib/board/kanban-parser.ts` with parse and serialize functions. |
| 2. Server functions | todo | Create `src/lib/board/board.functions.ts` with CRUD operations that read/parse, mutate, serialize/write. |
| 3. Preference | todo | Add `kanbanFile` to `UserPreferences` type, add combobox picker to preferences page. |
| 4. Board route | todo | Create `src/routes/board.tsx` with loader, column rendering, and mutation actions. |
| 5. Board UI components | todo | Create `src/components/board/` with `BoardView`, `BoardColumn`, `BoardTask` components. |
| 6. AI tools | todo | Register `board_list_tasks`, `board_add_task`, `board_update_task` in the chat tool registry. |
| 7. Nav integration | todo | Add to header nav and command palette `PAGES` array. |

## Open Questions

*No open questions.*

## Change Log

- 2026-03-17: Created initial requirements doc for Board (Kanban) feature.
