---
title: Obsidian Integration
status: done
owner: self
last_updated: 2026-03-22
canonical_file: docs/requirements/obsidian.md
---

# Obsidian Integration

## Purpose

- Problem: Obsidian vault files are only accessible through the Obsidian app or raw filesystem. There's no way to browse, search, or edit them inside Aether.
- Outcome: Authenticated users can browse their Obsidian vault as a tree, search by title, read pages with rendered Markdown, and edit files with a Markdown editor — all within Aether at `/o/$`.
- Notes: The vault may contain hundreds of documents, so the tree and search need to be performant. A special subdirectory (`OBSIDIAN_AI_CONFIG`) will hold Aether-specific config files for future AI features.

## Configuration

- `OBSIDIAN_DIR` — absolute path to the Obsidian vault root.
- `OBSIDIAN_AI_CONFIG` — relative path within `OBSIDIAN_DIR` for Aether config files (e.g. `ai-config`).
- `OBSIDIAN_AI_MEMORY` — relative path within `OBSIDIAN_DIR` for AI-managed memory notes (e.g. `ai-memory`).

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Header nav link | done | Add "Obsidian" link to the authenticated header nav, pointing to `/o`. |
| Route structure | done | `/o` shows the vault root; `/o/$` handles nested document paths. |
| Tree navigation | done | Persistent left-hand tree of the vault's folder/file structure, performant for hundreds of files. |
| Search by title | done | Title search that filters the tree or shows results, fast enough for large vaults. |
| Markdown rendering | done | Render `.md` files as readable content, similar to the requirements viewer. |
| Markdown editing | done | Edit `.md` files with a Markdown editor and save back to disk. |
| AI config section | done | Surface the `OBSIDIAN_AI_CONFIG` subdirectory as a distinct section with coral highlight for Aether config files. |
| AI memory section | done | Surface the `OBSIDIAN_AI_MEMORY` subdirectory as a distinct section with teal highlight and brain icon. Auto-creates subfolders on startup. |
| AI memory tool | done | `obsidian_ai_notes_list` tool for AI to recursively list its own memory notes with optional search and JMESPath filtering. |
| AI proactive memory | done | `ai_memory` tool as a proactive-recall wrapper that instructs the AI to search its persistent memory at the start of every conversation. |
| New file creation | done | Create new `.md` files from the vault browser with optional template selection. |
| Access control | done | Only authenticated users can access the Obsidian routes and file content. |
| @-mention autocomplete | done | Type `@` in chat to search vault files and insert references as `@\`filename\``. |
| AI config validation | done | AI config files are validated in real-time during editing, with unrecognized files flagged in both viewer and editor. |
| Chat export to Obsidian | done | Export chat threads as Markdown files to a configurable folder in the vault. |
| Settings page | done | `/settings/obsidian` for configuring templates folder and chat export folder preferences. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Env-based vault discovery | done | Server reads `OBSIDIAN_DIR`, `OBSIDIAN_AI_CONFIG`, and `OBSIDIAN_AI_MEMORY` to locate the vault, config dir, and memory dir. | Inline |
| Scalable tree building | done | Full tree loaded server-side, client-side filtering for search. Collapsible folders keep large vaults navigable. | Inline |
| Collapsible folders | done | Tree folders are collapsible with localStorage-persisted expanded state. Auto-expands path to current document. | Inline |
| Collapsible AI sections | done | AI Config and AI Memory sections in the tree are independently collapsible with localStorage-persisted state. | Inline |
| Title search | done | Client-side search input filters files by title and filename, showing matching files and ancestor folders. | Inline |
| Document viewer | done | Markdown rendered with react-markdown + remark-gfm, reusing the shared markdown-components pipeline. Relative Markdown links resolve to other vault documents. | Inline |
| Markdown editor | done | In-app editor for `.md` files using `@uiw/react-md-editor` (wrapped in a custom `MarkdownEditor` component with Lucide icons), lazy-loaded for performance. Explicit save button and `Cmd+S`/`Ctrl+S` keyboard shortcut. | Inline |
| Deep-link to edit mode | done | `/o/path/to/file?edit=true` opens the document directly in edit mode. | Inline |
| AI config area | done | Config subdirectory appears as a separate coral-highlighted collapsible section at the top of the tree with a sparkles icon. | Inline |
| AI config validation | done | Editing an AI config file shows real-time validation status (valid/errors) and a requirements description panel. Unrecognized config files show a warning banner in both viewer and editor. | [Detail](#ai-config-validation) |
| AI memory area | done | Memory subdirectory appears as a teal-highlighted collapsible section below AI config in the tree with a brain icon. Subfolders (`notes`, `templates`, `tasks`, `workflows`) auto-created on startup. | Inline |
| AI memory listing tool | done | `obsidian_ai_notes_list` AI tool recursively lists notes in the memory folder with metadata, optional subfolder scoping, text search, and JMESPath filtering. | [Detail](#ai-memory) |
| AI proactive memory tool | done | `ai_memory` tool wraps the same search logic as `obsidian_ai_notes_list` but with a description that instructs the AI to call it at the start of every conversation for proactive recall. | [Detail](#ai-memory) |
| New file dialog | done | "New" button in tree nav header opens a dialog with filename, folder selector, and optional template picker. Navigates to the new file on creation. | [Detail](#new-file-creation) |
| File templates | done | Templates sourced from a user-configurable vault folder (via `obsidianTemplatesFolder` preference) with fallback to bundled templates in `src/lib/obsidian/templates/`. Supports `{{title}}` and `{{date}}` placeholder interpolation. Ships with a Meeting template. | Inline |
| Path traversal protection | done | Path normalization rejects `..` traversal that escapes the vault root. | Inline |
| Missing file handling | done | Invalid paths show a not-found state with a link back to the vault root. | Inline |
| Vault index & fuzzy search | done | In-memory vault index built at server startup with chokidar file watching and fuse.js fuzzy search across titles, tags, aliases, headings, and content. | [Detail](#vault-index--fuzzy-search) |
| Path resolution | done | AI tools resolve partial paths (missing folder, missing `.md` extension, basename-only) to full vault paths via `resolveNotePath`. | Inline |
| @-mention autocomplete | done | `MentionTextarea` component with `useMentionAutocomplete` hook detects `@` in chat, queries `searchObsidianMentions` server function (backed by the vault index), and shows a keyboard-navigable popover of matching vault files. | [Detail](#mention-autocomplete) |
| Chat export to Obsidian | done | Chat threads can be exported as Markdown files to the vault. Export folder is configurable via `obsidianChatExportFolder` preference with `{YYYY}`/`{MM}` date placeholders. | Inline |
| Obsidian settings | done | `/settings/obsidian` page allows configuring the templates folder (from vault folders) and chat export folder path template. | Inline |

## Detail

### Route structure

- `/o` — landing page, shows the vault tree and a welcome view with file/folder counts.
- `/o/$` — catches all nested paths, resolves to files within `OBSIDIAN_DIR`. Supports `?edit=true` search parameter to open directly in edit mode.
- Pattern mirrors the requirements viewer (`/requirements/$`) but targets a much larger file set.

### Scalable tree navigation

- Full tree loaded server-side (recursive readdir is fast for hundreds of files).
- Folders are collapsible with chevron toggles, expanded state persisted in localStorage.
- Auto-expands the path to the currently viewed document on navigation.
- When searching, all matching folders are auto-expanded.

### Title search

- A search input at the top of the tree panel with a search icon.
- Filters visible files by title (frontmatter title or humanized filename) and filename.
- Client-side filtering for instant results.

### Markdown editing

- When viewing a document, a user can switch to edit mode.
- Uses `@uiw/react-md-editor` (wrapped in a custom `MarkdownEditor` component with Lucide icons) for Markdown editing with syntax highlighting and toolbar. The editor is lazy-loaded for performance.
- Edit button in document header toggles between view and edit modes. Documents can also be opened directly in edit mode via the `?edit=true` URL parameter.
- Edits the raw file content (including frontmatter) so nothing is lost on save.
- Save writes back to the filesystem via `saveObsidianDocument` server function with path traversal protection.
- Explicit save button with unsaved-changes indicator; cancel returns to view mode. Supports `Cmd+S` / `Ctrl+S` keyboard shortcut.

### AI config section

- The `OBSIDIAN_AI_CONFIG` dir (e.g. `ai-config/` inside the vault) is surfaced as a distinct collapsible section at the top of the tree nav.
- Styled with coral highlight background, sparkles icon, and "AI Config" label.
- These config files have special meaning — they are validated in real-time when edited and unrecognized filenames show a warning banner.

### AI config validation

- When viewing or editing an AI config file, Aether checks if the filename corresponds to a recognized config type via `getAiConfigValidatorInfo`.
- **Unrecognized files** show an amber warning banner: "X is not a recognized config file and will not be used by Aether."
- **Recognized files** in the editor show a validation panel at the bottom with:
  - Real-time validation status (valid with checkmark, or error count with details) — validated via `validateAiConfigContent` server function with 400ms debounce.
  - A requirements description section rendered as Markdown, explaining the expected format.

## Implementation Plan

| Step | Status | Plan |
| --- | --- | --- |
| 1. Env + server functions | done | `src/lib/obsidian.functions.ts` reads env vars, builds tree, reads documents. |
| 2. Route setup | done | `/o` index and `/o/$` catch-all routes with auth gating in `src/routes/o/`. |
| 3. Tree component | done | Collapsible tree in `src/components/obsidian/ObsidianTreeNav.tsx` with localStorage persistence. |
| 4. Search | done | Title/filename search input filters the tree client-side. |
| 5. Document rendering | done | `ObsidianViewer.tsx` renders Markdown with shared pipeline, link resolution, and document header. |
| 6. Markdown editor | done | `ObsidianEditor.tsx` with `@uiw/react-md-editor`, edit button in document header, `saveObsidianDocument` server function. |
| 7. Header nav | done | "Obsidian" link added to `Header.tsx` for authenticated users. |
| 8. AI config section | done | Config dir shown as coral-highlighted section with sparkles icon in tree nav. |
| 9. Polish | done | Welcome page, missing-document state, unconfigured state, path traversal protection. |
| 10. New file creation | done | "New" button in tree nav, dialog with filename/folder/template, server functions for templates and file creation. |
| 11. AI config validation | done | Real-time validation of AI config files in the editor with debounced validation and requirements display. |
| 12. @-mention autocomplete | done | `MentionTextarea` + `useMentionAutocomplete` hook + `searchObsidianMentions` server function for chat @-mentions. |
| 13. Chat export | done | Export chat threads to vault as Markdown files with configurable folder path. |
| 14. Settings page | done | `/settings/obsidian` for templates folder and chat export folder preferences. |

### Vault index & fuzzy search

Replaces the naive filesystem-walk search with a persistent in-memory index that's built eagerly at server startup and kept current via file watching.

**Architecture:**
- `src/lib/obsidian/vault-index.ts` — singleton index manager
- On server start: chokidar watches `OBSIDIAN_DIR` for `.md` files, parsing each with `gray-matter`
- Per note, the index stores: `title`, `aliases` (frontmatter), `tags` (frontmatter + inline `#tags`), `headings` (h1–h4), `folder`, `mtime`, and a body snippet (first 500 chars)
- A fuse.js instance provides fuzzy search with weighted keys: title (1.0) > aliases (0.8) > tags (0.7) > headings (0.6) > path (0.4) > body (0.3)
- File add/change/unlink events update the index entry and debounce-rebuild the fuse index (300ms)
- `resolveNotePath` resolves partial or basename-only paths to full relative paths using exact match, `.md` suffix, then unique basename match

**Benefits over previous approach:**
- Fuzzy matching with relevance scoring (typo tolerance, partial matches)
- Searches structured metadata (tags, aliases, headings) — not just filename and raw content
- No filesystem I/O on each search — queries are instant against the in-memory index
- Index stays current without restart via chokidar file watching

**Search result shape:**
- `relativePath`, `title`, `tags`, `aliases`, `headings`, `folder`, `score` (0–100, 100 = perfect match)

### AI Memory

A dedicated folder in the Obsidian vault (`OBSIDIAN_AI_MEMORY`) where the AI manages its own persistent notes. The folder is transparent to the user — all notes are regular Obsidian Markdown files that can be read and edited in Obsidian or Aether's vault browser.

**Folder structure (auto-created on startup):**
- `notes/` — general notes the AI writes for later reference
- `templates/` — reusable templates the AI can store and apply
- `tasks/` — task instructions and common procedures
- `workflows/` — workflow notes (future expansion)

**System prompt integration:**
- The `{{aiMemoryPath}}` placeholder is interpolated into the system prompt so the AI knows the path to its memory folder.
- The system prompt should describe the folder structure and guide the AI on how to organize notes.

**AI tool — `obsidian_ai_notes_list`:**
- Recursively lists all `.md` files in the AI memory folder with metadata (path, title, tags, aliases, headings, mtime).
- Optional `subfolder` parameter scopes listing to a specific subdirectory (e.g. `notes`, `tasks`).
- Optional `search` parameter filters results by case-insensitive match against title, path, or tags.
- Optional `filter` parameter applies a JMESPath expression to the results for structured filtering (e.g. `[?contains(tags, 'important')]`).
- Results sorted by modification time (most recent first).
- The AI uses `obsidian_read`, `obsidian_write`, and `obsidian_edit` to manage individual files once found.

**AI tool — `ai_memory`:**
- A proactive-recall wrapper around the same search logic as `obsidian_ai_notes_list`.
- Its tool description strongly instructs the AI to call it at the start of every conversation to recall user preferences, people, projects, and past decisions.
- Accepts `search` (keyword) and `subfolder` parameters. Omitting `search` lists all memories.
- Defined in `src/lib/tools/ai-memory.ts`, using shared `searchAiMemoryNotes` from `src/lib/tools/obsidian-ai-notes.ts`.

**Sidebar:**
- The AI memory folder is highlighted in the Obsidian tree nav with a teal background and brain icon, similar to the coral AI config section.
- Both the AI config and AI memory sections are independently collapsible with localStorage-persisted state.

### Mention autocomplete

@-mention autocomplete allows users to reference vault files in chat messages.

**Architecture:**
- `src/hooks/useMentionAutocomplete.ts` — hook that detects `@` typed at start or after whitespace, debounces queries, and provides keyboard navigation + selection logic.
- `src/components/mentions/MentionTextarea.tsx` — a `Textarea` wrapper with built-in @-mention support. Typing `@` shows a popover of matching vault files.
- `src/lib/obsidian.functions.ts` — `searchObsidianMentions` server function queries the vault index. Empty queries return the 10 most recently modified notes; non-empty queries use fuse.js fuzzy search.

**Interaction:**
- Type `@` in the chat textarea to trigger the autocomplete popover.
- Navigate results with arrow keys, confirm with Enter/Tab, dismiss with Escape.
- Selecting a result inserts `` @`filename` `` at the cursor position.

### New file creation

A "New" button in the vault browser tree nav header opens a dialog for creating new Markdown files.

**Dialog fields:**
- **Filename** — required, `.md` appended automatically if omitted.
- **Folder** — dropdown of all vault folders, defaults to vault root. Populated via `listObsidianFolders` server function.
- **Template** — optional dropdown listing templates. Defaults to "Blank file".

**Template system:**
- Templates are sourced from a user-configurable vault folder (set via `obsidianTemplatesFolder` preference in `/settings/obsidian`). Falls back to bundled templates in `src/lib/obsidian/templates/` if the preference is unset or the folder is empty.
- Supports `{{title}}` and `{{date}}` placeholders, interpolated at creation time.
- Ships with a **Meeting** template including attendees, agenda, notes, and action items sections.
- Adding new templates is as simple as dropping a `.md` file into the templates directory.

**Server functions:**
- `listObsidianTemplates()` — returns available templates from the user-configured vault folder or the bundled templates directory.
- `listObsidianFolders()` — returns all folder paths in the vault (for the folder picker).
- `createObsidianFile()` — creates the file on disk with template interpolation, path validation, and duplicate detection. Logs the creation to the activity log.

**After creation:** the user is navigated to the new file, which can immediately be edited.

## Open Questions

- Should Obsidian wiki-links (`[[page]]`) be resolved and rendered as navigable links?
- How should binary files (images, PDFs) referenced in Markdown be handled — serve them or ignore?

## Change Log

- 2026-03-14: Created initial requirements doc for Obsidian vault integration with tree browsing, search, Markdown viewing/editing, and AI config section.
- 2026-03-14: Implemented read-only vault browser with collapsible tree, title search, Markdown rendering, AI config highlighting, auth gating, and header nav link. Editing remains todo.
- 2026-03-14: Added Markdown editing with `@uiw/react-md-editor`. Edit button in document header, explicit save, unsaved-changes indicator, path traversal protection on save.
- 2026-03-14: Replaced naive filesystem-walk search with in-memory vault index using chokidar + gray-matter + fuse.js. Eager init at server startup, fuzzy search across titles/tags/aliases/headings/content with weighted relevance scoring.
- 2026-03-15: Added `obsidian_edit` AI tool for targeted search-and-replace edits to vault notes, reducing token usage and errors compared to full-file rewrites via `obsidian_write`.
- 2026-03-15: Fixed AI tool prompt drift by documenting `obsidian_folders`/`obsidian_list` instead of the nonexistent `obsidian_tree`, clarified when to use `obsidian_edit` vs `obsidian_write`, and updated `obsidian_write` so it can create new notes without a prior read while still protecting overwrites of existing files.
- 2026-03-15: Added AI memory folder support — `OBSIDIAN_AI_MEMORY` env var, auto-created subfolders (notes, templates, tasks, workflows), `obsidian_ai_notes_list` tool with JMESPath filtering, `{{aiMemoryPath}}` system prompt placeholder, and teal-highlighted sidebar section with brain icon.
- 2026-03-15: Added new file creation — "New" button in tree nav, dialog with filename/folder/template selection, bundled Meeting template, server functions `listObsidianTemplates`, `listObsidianFolders`, `createObsidianFile`.
- 2026-03-22: Requirements audit — documented features added since last update: `ai_memory` proactive-recall tool, AI config validation in viewer/editor, collapsible AI sections in sidebar, @-mention autocomplete for chat, `?edit=true` deep-link to edit mode, `Cmd+S` keyboard shortcut, `resolveNotePath` for partial path resolution in AI tools, user-configurable templates folder via settings, chat export to Obsidian, `/settings/obsidian` page, relative link resolution in document viewer, and lazy-loaded editor component.
