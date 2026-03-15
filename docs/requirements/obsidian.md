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
| Markdown editing | todo | Edit `.md` files with a Markdown editor and save back to disk. |
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
| Markdown editor | todo | In-app editor for `.md` files with preview, saving changes back to the filesystem. | Inline |
| AI config area | done | Config subdirectory appears as a separate coral-highlighted section at the top of the tree with a sparkles icon. | Inline |
| Path traversal protection | done | Path normalization rejects `..` traversal that escapes the vault root. | Inline |
| Missing file handling | done | Invalid paths show a not-found state with a link back to the vault root. | Inline |

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
- Editor should support Markdown syntax (consider CodeMirror, Monaco, or a purpose-built Markdown editor component).
- Save writes back to the filesystem via a server function.
- Consider autosave or explicit save button — start with explicit save.

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
| 6. Markdown editor | todo | Add edit mode with a Markdown editor component and save-to-disk server function. |
| 7. Header nav | done | "Obsidian" link added to `Header.tsx` for authenticated users. |
| 8. AI config section | done | Config dir shown as coral-highlighted section with sparkles icon in tree nav. |
| 9. Polish | done | Welcome page, missing-document state, unconfigured state, path traversal protection. |

## Open Questions

- Should the editor support live preview (side-by-side) or just a simple textarea with a preview toggle?
- Should Obsidian wiki-links (`[[page]]`) be resolved and rendered as navigable links?
- How should binary files (images, PDFs) referenced in Markdown be handled — serve them or ignore?

## Change Log

- 2026-03-14: Created initial requirements doc for Obsidian vault integration with tree browsing, search, Markdown viewing/editing, and AI config section.
- 2026-03-14: Implemented read-only vault browser with collapsible tree, title search, Markdown rendering, AI config highlighting, auth gating, and header nav link. Editing remains todo.
