---
title: Requirements Viewer
status: done
owner: self
last_updated: 2026-03-22
canonical_file: docs/requirements/requirements-viewer.md
---

# Requirements Viewer

## Purpose

- Problem: Requirements live in `docs/requirements/` today, but they are only browsable from the repo instead of inside the authenticated app where the rest of the product work happens.
- Outcome: Authenticated users can open an in-app requirements area, land on the requirements index by default, browse a left-hand file tree, and open linked requirement pages without leaving Aether.
- Notes: This requirement is for read-only viewing of the existing Markdown docs and their internal links, and it assumes the requirements-writing skill will be updated so doc metadata moves into frontmatter for easier extraction in the app.

## Current Reality

- Current behavior: Authenticated users can open `/requirements` to view `docs/requirements/index.md`, browse a left-hand tree generated from `docs/requirements/`, open linked requirement docs inside the app, and see frontmatter-backed metadata in the page chrome. The tree nav shows color-coded status badges next to each document, and the document header displays a gradient band, status, owner, and last-updated metadata pills.
- Constraints: The source of truth remains the files in `docs/requirements/`; access must be limited to authenticated users; the viewer must support docs that link to each other; the navigation should reflect the folder structure in that directory; metadata extraction comes from frontmatter.
- Non-goals: In-app editing, public access, arbitrary Markdown browsing outside `docs/requirements/`, document version history, and full docs-site features such as search or comments are not part of this requirement.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Access control | done | Only authenticated users can load the requirements viewer and its document content. |
| Default entry point | done | The requirements route opens the `docs/requirements/index.md` content by default. |
| File-tree navigation | done | The viewer renders a left-hand navigation tree based on the files and folders under `docs/requirements/`. |
| Document routing | done | Users can open individual requirement pages from the tree and via links inside documents. |
| Frontmatter metadata | done | Requirement docs expose key document metadata in frontmatter so the viewer can extract titles and supporting details cleanly. |
| Markdown presentation | done | Requirement docs render cleanly in-app as readable linked Markdown content. |
| Document header chrome | done | Each document shows a header with title, canonical file path, status badge, owner pill, and last-updated pill. |
| Status badges in nav | done | The tree nav shows color-coded status badges (done, in-progress, todo) next to each document entry. |
| Hash link preservation | done | In-document anchor links with hash fragments are preserved when navigating between requirement docs. |
| Path traversal protection | done | Document lookup normalizes paths and blocks `..` segments that would escape `docs/requirements/`. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Authenticated route gating | done | Anonymous users are redirected before any requirements content is shown. | Inline |
| Requirements index landing | done | The top-level requirements route shows the index document by default. | Inline |
| Left-hand tree nav | done | The viewer shows a tree of folders and eligible subfolders from `docs/requirements/`, with the current document highlighted and status badges shown. | Inline |
| Linked document navigation | done | Clicking a nav item or an in-document link opens the target requirement page inside the same viewer flow. | Inline |
| Frontmatter-backed titles | done | Document titles and other top-level metadata are read from frontmatter instead of inferred from Markdown body content. | Inline |
| Markdown document rendering | done | Markdown docs display as readable content with headings, tables, code blocks, and inline links preserved, using shared markdown components. | Inline |
| Missing-document handling | done | Invalid or removed document paths fail gracefully with a not-found state and a link back to the requirements index. | Inline |
| Document header chrome | done | A gradient-banded header shows the document title, canonical file path, and frontmatter metadata as status badges and meta pills. | Inline |
| Status badges | done | Color-coded status badges support `done`, `in-progress`, `todo`, and unknown statuses in both the nav tree (small) and document header (medium). | Inline |
| Hash link support | done | In-document links with hash fragments (e.g., `#section-name`) are extracted and passed through to the target route. | Inline |
| Sticky nav panel | done | The tree nav is sticky on large screens with overflow scrolling for long requirement lists. | Inline |
| Tree sorting | done | Folders sort before files; files sort alphabetically by title, with the index document always first. | Inline |
| Command palette entry | done | The requirements viewer is listed in the `Cmd+K` command palette. | Inline |
| Storybook stories | done | Stories exist for `TreeNav`, `StatusBadge`, `DocumentHeader`, `MissingDocument`, and `MetaPill` components. | Inline |

## Detail

### Access control

- Requirement: The requirements viewer and any document-fetching path behind it must require a valid authenticated session.
- Notes: This matches the requested audience of any signed-in user, not only admins. Both routes (`/requirements` and `/requirements/$`) use `beforeLoad` with `getSession()` to redirect unauthenticated users, and the server function uses `ensureSession()` as a second layer.
- Dependencies: Existing auth/session patterns used by other protected routes.
- Follow-up: Keep route protection consistent with other authenticated pages so the docs area does not become a special-case auth flow.

### Default route behavior

- Requirement: Opening the requirements area with no specific document selected must render the contents of `docs/requirements/index.md`.
- Notes: The current implementation uses `/requirements` for the default landing view and `/requirements/$` for opening specific requirement documents, including nested paths without the `.md` suffix.
- Dependencies: `docs/requirements/index.md` and the new app route structure.
- Follow-up: Decide whether canonical links inside docs should normalize to path slugs without the `.md` suffix.

### Left-hand navigation tree

- Requirement: The viewer must show a persistent left-hand navigation panel built from the folder and file structure under `docs/requirements/`.
- Notes: The tree supports nested folders, only shows folders that contain at least one requirement file somewhere inside them, and highlights the currently open document with a teal active indicator. The nav panel is sticky on large screens with overflow-y scrolling for long lists. Each document entry shows a small status badge when a status is present in frontmatter.
- Dependencies: Server-side access to the `docs/requirements/` directory structure.
- Follow-up: Decide whether the tree should also expose folder-level summary labels if nested requirements become more numerous.

### Opening documents from nav and links

- Requirement: Users must be able to navigate between requirement docs by clicking either the left-hand tree or Markdown links inside the rendered document.
- Notes: In-document requirement links are normalized into the viewer route, while external links open in a new tab with `target="_blank"`. Hash fragments in links are extracted and preserved so anchor navigation works across documents.
- Dependencies: Markdown link parsing and a route format that can represent any document inside `docs/requirements/`.
- Follow-up: Normalize supported links to the requirement-doc set and define how non-requirements links should behave if they appear later.

### Frontmatter metadata and skill alignment

- Requirement: Requirement docs must store top-level metadata in frontmatter, and the requirements-writing skill must be updated to keep generating docs in that format.
- Notes: The viewer extracts `title`, `status`, `owner`, `last_updated`, and `canonical_file` from frontmatter. These are displayed in the document header as a title, canonical file path, status badge, owner pill, and last-updated pill respectively. The `status` field also appears as a small badge in the tree nav.
- Dependencies: `docs/requirements/` document format and the `requirements-docs` skill/template workflow.
- Follow-up: Define the minimum frontmatter schema to standardize across all requirement docs, such as `title`, `status`, `owner`, `last_updated`, and `canonical_file`.

### Markdown rendering

- Requirement: The viewer must render requirement Markdown in a readable app-native layout.
- Notes: The viewer uses shared `createMarkdownComponents` and `CodeBlockPre` from `#/components/markdown/markdown-components` with custom link handling for requirement-internal links. Links to other requirement docs are rendered as TanStack Router `<Link>` components, while external links get `target="_blank"` and `rel="noreferrer"`.
- Dependencies: `react-markdown`, `remark-gfm`, shared markdown component library, and the viewer component styling.
- Follow-up: Decide which frontmatter fields should surface in the page chrome versus staying metadata-only.

### Missing or invalid document paths

- Requirement: If a requested requirement file does not exist, the viewer must show a clear not-found state within the authenticated app shell.
- Notes: The `MissingDocument` component shows a coral-tinted icon, a descriptive message including the requested path, and a prominent button linking back to the requirements index. This covers stale links, renamed docs, and manual URL edits.
- Dependencies: Document lookup and route param validation.

### Document header chrome

- Requirement: Each document must display a header section showing the document title and key metadata from frontmatter.
- Notes: The `DocumentHeader` component renders a teal-to-coral gradient band at the top, followed by the document title (using the display font), canonical file path in monospace, and a row of metadata: a `StatusBadge` for the status field, and `MetaPill` components for owner and last-updated. All fields are optional and only shown when present in frontmatter.
- Dependencies: `StatusBadge` and `MetaPill` components, document frontmatter.

### Path traversal protection

- Requirement: Document lookup must normalize paths and prevent traversal outside the `docs/requirements/` directory.
- Notes: The `normalizeRelativePath` function rejects any path containing `..` segments that would escape the root by returning `null`, which the viewer treats as a missing document.
- Dependencies: Server-side path resolution in `requirements.functions.ts`.

## Implementation Plan

| Step | Status | Plan |
| --- | --- | --- |
| 1. Frontmatter foundation | done | Requirement docs use frontmatter-backed metadata for navigation labels and page chrome. |
| 2. Document discovery layer | done | A server-side loader enumerates `docs/requirements/`, filters to Markdown files, keeps only folders with at least one file, and returns tree plus document metadata. |
| 3. Route structure | done | `/requirements` renders the default index view and `/requirements/$` handles nested docs. |
| 4. Markdown loading | done | Requested document paths are resolved inside `docs/requirements/`, parsed into frontmatter and body, and returned as normalized viewer payloads. |
| 5. Viewer layout | done | The authenticated page layout includes a persistent left nav tree, current-document highlighting, and a main Markdown content pane. |
| 6. Link normalization | done | In-document requirement links are normalized into the viewer route so navigation stays in-app. Hash fragments are preserved. |
| 7. Not-found and edge states | done | Missing or invalid document paths show a clear not-found state with a link back to the requirements index. |
| 8. Polish and verification | done | The viewer has custom markdown element styling, wider layout tuning, verified auth gating, route transitions, status badges in nav, document header chrome, and Storybook stories. |

### Implementation notes

- Start with a read-only server-backed viewer; do not couple the first pass to editing workflows.
- Treat frontmatter as the source for navigation labels and page chrome, while Markdown body remains the source for long-form content.
- Normalize document lookup so URLs cannot escape `docs/requirements/` through relative path traversal.
- Prefer route and path helpers for internal requirement links so future nested docs keep working when folder structure grows.
- Use shared markdown components from `#/components/markdown/markdown-components` for consistent rendering across the app.

## Open Questions

- Should folders in the left nav stay always expanded, or should they become collapsible if the requirements tree grows?

## Change Log

- 2026-03-14: Created the initial requirements doc for an authenticated in-app requirements viewer with index landing, linked document routing, and a left-hand file tree.
- 2026-03-14: Updated the doc to use `/requirements/$` document routing, require frontmatter-backed titles and metadata, align the requirements-writing skill with that format, and support nested folders that contain requirement files.
- 2026-03-14: Added an implementation plan covering frontmatter migration, document discovery, routing, rendering, link normalization, and edge-state handling.
- 2026-03-14: Migrated the requirements docs to frontmatter-backed metadata so the viewer can consume the same schema the skill now generates.
- 2026-03-14: Implemented the authenticated requirements viewer with `/requirements` index landing, nested document routing, frontmatter-backed metadata display, in-app link normalization, missing-document handling, and custom `react-markdown` styling.
- 2026-03-22: Updated requirements doc to reflect implemented features not previously documented: document header chrome with gradient band and metadata pills, status badges in tree nav, hash link preservation, path traversal protection, sticky nav panel, tree sorting, command palette entry, shared markdown components, and Storybook stories.
