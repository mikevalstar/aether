---
title: Obsidian Integration
status: in-progress
owner: self
last_updated: 2026-03-14
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
| Access control | done | Only authenticated users can access the Obsidian routes and file content. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Env-based vault discovery | done | Server reads `OBSIDIAN_DIR` and `OBSIDIAN_AI_CONFIG` to locate the vault and config dir. | Inline |
| Scalable tree building | done | Full tree loaded server-side, client-side filtering for search. Collapsible folders keep large vaults navigable. | Inline |
| Collapsible folders | done | Tree folders are collapsible with localStorage-persisted expanded state. Auto-expands path to current document. | Inline |
| Title search | done | Client-side search input filters files by title and filename, showing matching files and ancestor folders. | Inline |
| Document viewer | done | Markdown rendered with react-markdown + remark-gfm, reusing the shared markdown-components pipeline. | Inline |
| Markdown editor | done | In-app editor for `.md` files using `@uiw/react-md-editor`, with explicit save button writing back to the filesystem. | Inline |
| AI config area | done | Config subdirectory appears as a separate coral-highlighted section at the top of the tree with a sparkles icon. | Inline |
| Path traversal protection | done | Path normalization rejects `..` traversal that escapes the vault root. | Inline |
| Missing file handling | done | Invalid paths show a not-found state with a link back to the vault root. | Inline |
| Vault index & fuzzy search | done | In-memory vault index built at server startup with chokidar file watching and fuse.js fuzzy search across titles, tags, aliases, headings, and content. | [Detail](#vault-index--fuzzy-search) |

## Detail

### Route structure

- `/o` — landing page, shows the vault tree and a welcome view with file/folder counts.
- `/o/$` — catches all nested paths, resolves to files within `OBSIDIAN_DIR`.
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
- Uses `@uiw/react-md-editor` for Markdown editing with syntax highlighting and toolbar.
- Edit button in document header toggles between view and edit modes.
- Edits the raw file content (including frontmatter) so nothing is lost on save.
- Save writes back to the filesystem via `saveObsidianDocument` server function with path traversal protection.
- Explicit save button with unsaved-changes indicator; cancel returns to view mode.

### AI config section

- The `OBSIDIAN_AI_CONFIG` dir (e.g. `ai-config/` inside the vault) is surfaced as a distinct section at the top of the tree nav.
- Styled with coral highlight background, sparkles icon, and "AI Config" label.
- Future work will give these config files special meaning (AI prompts, tool configs, etc.).

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

### Vault index & fuzzy search

Replaces the naive filesystem-walk search with a persistent in-memory index that's built eagerly at server startup and kept current via file watching.

**Architecture:**
- `src/lib/obsidian/vault-index.ts` — singleton index manager
- On server start: chokidar watches `OBSIDIAN_DIR` for `.md` files, parsing each with `gray-matter`
- Per note, the index stores: `title`, `aliases` (frontmatter), `tags` (frontmatter + inline `#tags`), `headings` (h1–h4), `folder`, `mtime`, and a body snippet (first 500 chars)
- A fuse.js instance provides fuzzy search with weighted keys: title (1.0) > aliases (0.8) > tags (0.7) > headings (0.6) > path (0.4) > body (0.3)
- File add/change/unlink events update the index entry and debounce-rebuild the fuse index (300ms)

**Benefits over previous approach:**
- Fuzzy matching with relevance scoring (typo tolerance, partial matches)
- Searches structured metadata (tags, aliases, headings) — not just filename and raw content
- No filesystem I/O on each search — queries are instant against the in-memory index
- Index stays current without restart via chokidar file watching

**Search result shape:**
- `relativePath`, `title`, `tags`, `aliases`, `headings`, `folder`, `score` (0–100, 100 = perfect match)

## Open Questions

- Should Obsidian wiki-links (`[[page]]`) be resolved and rendered as navigable links?
- How should binary files (images, PDFs) referenced in Markdown be handled — serve them or ignore?

## Change Log

- 2026-03-14: Created initial requirements doc for Obsidian vault integration with tree browsing, search, Markdown viewing/editing, and AI config section.
- 2026-03-14: Implemented read-only vault browser with collapsible tree, title search, Markdown rendering, AI config highlighting, auth gating, and header nav link. Editing remains todo.
- 2026-03-14: Added Markdown editing with `@uiw/react-md-editor`. Edit button in document header, explicit save, unsaved-changes indicator, path traversal protection on save.
- 2026-03-14: Replaced naive filesystem-walk search with in-memory vault index using chokidar + gray-matter + fuse.js. Eager init at server startup, fuzzy search across titles/tags/aliases/headings/content with weighted relevance scoring.
- 2026-03-15: Added `obsidian_edit` AI tool for targeted search-and-replace edits to vault notes, reducing token usage and errors compared to full-file rewrites via `obsidian_write`.
