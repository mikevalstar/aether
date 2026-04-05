---
title: Board (Kanban)
status: done
owner: self
last_updated: 2026-04-05
canonical_file: docs/requirements/board.md
---

# Board (Kanban)

## Purpose

- Problem: No way to manage tasks/to-dos inside Aether. Task lists live in Obsidian kanban files but aren't surfaced in the dashboard.
- Outcome: A kanban board plugin (`board`) that reads an Obsidian Kanban-format Markdown file and renders a full interactive kanban board with add/remove/move. AI can also query and modify tasks via dedicated tools.
- Notes: The board operates directly on the Obsidian Markdown file — no database models. The file format follows the Obsidian Kanban plugin conventions. As of 2026-04-05, the board is implemented as a plugin using the Aether plugin system, with its page accessible at `/p/board`.

## File Format

The kanban file is standard Markdown with Obsidian Kanban plugin conventions:

- Frontmatter: `kanban-plugin: board`
- Columns: `## Heading` — each H2 is a column
- Tasks: `- [ ] Task text` (open) or `- [x] Task text` (completed/archived)
- Archive: `## Archive` section contains completed items with `✅ YYYY-MM-DD` — **hidden from UI**
- Footer: `%% kanban:settings` block with JSON config — preserved on write

## Configuration

- **User preference**: `kanbanFile` field in the `UserPreferences` JSON on the User model.
- **Dashboard column preference**: `dashboardColumn` field in the board plugin's options (stored in `UserPreferences.pluginOptions.board`) — selects which column to show as a read-only widget on the dashboard.
- Configured at `/settings/plugins/board` (via the plugin settings system) using a searchable combobox (vault file picker via fuzzy search, filtering to `.md` files). The dashboard column is configured with a select dropdown on the same page.
- When no file is configured, `/p/board` shows an empty state directing the user to plugin settings.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Board page | done | `/p/board` plugin page showing kanban columns parsed from the configured Obsidian Markdown file. |
| Dynamic columns | done | Columns derived from `##` headings in the file. Order matches file order. |
| Add task | done | Add a new task to any column. |
| Remove task | done | Delete a task from any column. |
| Move task | done | Move a task between columns (change status) and reorder within a column. |
| File picker setting | done | Searchable combobox in `/settings/plugins/board` to select the kanban file from the Obsidian vault. |
| Dashboard column setting | done | Select dropdown in `/settings/plugins/board` to choose a column to display as a read-only dashboard widget. |
| Dashboard widget | done | Plugin widget on the dashboard showing tasks from the configured column, with a link to the full board. |
| AI tools | done | Dedicated tools for the AI to list columns, list tasks, add tasks, and update/move tasks. |
| Command palette | done | Board page auto-registered in CommandPalette via plugin pages system. |
| Header nav | done | Board page appears in the "Plugins" dropdown in the header navigation. |
| Plugin system | done | Board implemented as an Aether plugin (`board`) with pages, widget, settings, and commands. |
| Activity logging | done | All board file changes (manual and AI) are logged via `logFileChange` with a `changeSource` field (`"manual"` or `"ai"`). |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Kanban file parser | done | Parse the Obsidian Kanban Markdown format into structured columns + tasks. | [Detail](#kanban-file-parser) |
| Kanban file serializer | done | Serialize structured data back to valid Obsidian Kanban Markdown, preserving frontmatter and settings footer. | [Detail](#kanban-file-serializer) |
| Board UI | done | Interactive kanban board with columns, task cards, and drag-and-drop movement via `@dnd-kit/react`. | [Detail](#board-ui) |
| Empty/unconfigured state | done | Friendly state when no kanban file is selected, with link to `/settings/board`. | Inline |
| Setting: kanban file picker | done | Searchable combobox in `/settings/board` for selecting the kanban `.md` file. | [Detail](#kanban-file-picker) |
| Setting: dashboard column | done | Select dropdown in `/settings/board` to choose which column appears on the dashboard. | [Detail](#dashboard-column-setting) |
| Dashboard board widget | done | Read-only `DashboardBoardColumn` component showing tasks from the selected column on the dashboard. | [Detail](#dashboard-board-widget) |
| AI tool: `board_list_columns` | done | List all column names with task counts. | [Detail](#ai-tools) |
| AI tool: `board_list_tasks` | done | List all tasks with their column/status, optional column filter. | [Detail](#ai-tools) |
| AI tool: `board_add_task` | done | Add a new task to a specified column. | [Detail](#ai-tools) |
| AI tool: `board_update_task` | done | Update task text or move to a different column. | [Detail](#ai-tools) |

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

- Each column rendered as a vertical lane with the `##` heading as the column title and a task count badge.
- Columns have subtle accent color borders and backgrounds, cycling through 6 colors (teal, coral, amber, violet, sky, rose).
- Tasks shown as cards/items within each column with a drag handle and delete button (visible on hover).
- **Add**: Input/button at the bottom of each column to add a new task.
- **Remove**: Delete button/icon on each task card (visible on hover).
- **Move**: Drag-and-drop between columns and reorder within a column using `@dnd-kit/react` (`DragDropProvider`, `useSortable`, `useDroppable`).
- All mutations save back to the file immediately via server functions.
- Columns and column management (add/remove/rename) are not editable from the board UI — managed by editing the file directly in Obsidian or the vault browser.
- Responsive: columns scroll horizontally if they overflow.

### Kanban file picker

- Located in the Obsidian section of settings at `/settings/board`.
- Uses a searchable combobox component (similar pattern to existing vault folder picker but searching files).
- Searches `.md` files in the vault via fuzzy search using `searchVaultFiles` server function.
- Stores the selected file's relative path in `UserPreferences.kanbanFile`.
- Includes a clear button to deselect the file.

### Dashboard column setting

- Located on the same `/settings/board` page, below the kanban file picker.
- Only visible when a kanban file is configured and has columns.
- Uses a `Select` dropdown populated with the columns from the configured kanban file, showing task counts.
- Stores the selected column name in `UserPreferences.dashboardBoardColumn`.
- Includes a clear button to deselect the column.

### Dashboard board widget

- `DashboardBoardColumn` component in `src/components/board/DashboardBoardColumn.tsx`.
- Shows as a card on the dashboard grid when a dashboard column is configured.
- Displays the column name, task count, and a read-only list of tasks with checkbox indicators.
- Includes a link to the full `/board` page.
- Checked tasks are shown with a strikethrough style.

### AI tools

Four dedicated tools registered alongside existing chat tools in `src/lib/ai-tools.ts`:

**`board_list_columns`**
- Parameters: none.
- Returns: all column names with their task counts.

**`board_list_tasks`**
- Parameters: optional `column` filter (string, case-insensitive match).
- Returns: all tasks grouped by column with their text and checked status.
- Skips the Archive section.

**`board_add_task`**
- Parameters: `task` (string, required), `column` (string, required, case-insensitive match).
- Adds a `- [ ] task` line to the specified column.
- Returns confirmation with the column name and task text.

**`board_update_task`**
- Parameters: `task` (string, required — existing task text to match exactly), `newText` (string, optional — updated text), `newColumn` (string, optional — column to move to, case-insensitive match).
- Finds the task by exact text match across all columns, updates text and/or moves to new column.
- Returns confirmation with what changed.

All tools read/write the kanban file configured in the current user's preferences. AI changes are logged with `changeSource: "ai"`.

## Implementation Plan

| Step | Status | Plan |
| --- | --- | --- |
| 1. Parser/serializer | done | Create `src/lib/board/kanban-parser.ts` with parse and serialize functions. |
| 2. Server functions | done | Create `src/lib/board/board.server.ts` (server-only helpers) and `src/lib/board/board.functions.ts` (createServerFn wrappers). |
| 3. Settings | done | Add `kanbanFile` and `dashboardBoardColumn` to `UserPreferences` type, add `/settings/board` page with file picker and dashboard column selector. |
| 4. Board route | done | Create `src/routes/board.tsx` with loader, column rendering, and mutation actions. |
| 5. Board UI components | done | Create `src/components/board/` with `BoardView`, `BoardColumn`, `BoardTask` components. |
| 6. Dashboard widget | done | Create `src/components/board/DashboardBoardColumn.tsx` and integrate into dashboard grid. |
| 7. AI tools | done | Register `board_list_columns`, `board_list_tasks`, `board_add_task`, `board_update_task` in the chat tool registry. |
| 8. Nav integration | done | Add to header nav and command palette `PAGES` array. |

## Open Questions

*No open questions.*

## Change Log

- 2026-03-17: Created initial requirements doc for Board (Kanban) feature.
- 2026-03-21: Marked all requirements and sub-features as done. All implemented: parser/serializer, board UI with drag-and-drop, task CRUD, file picker settings, AI tools (list_tasks, list_columns, add_task, update_task), header nav, command palette, dashboard widget.
- 2026-03-22: Updated doc to accurately reflect implementation details: settings at `/settings/board` (not `/settings/preferences`), documented `board_list_columns` AI tool, dashboard column preference and widget, activity logging for board changes, `@dnd-kit/react` for drag-and-drop, column accent colors, case-insensitive column matching in AI tools, and `board.server.ts` separation.
