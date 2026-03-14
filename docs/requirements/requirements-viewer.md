---
title: Requirements Viewer
status: done
owner: self
last_updated: 2026-03-14
canonical_file: docs/requirements/requirements-viewer.md
---

# Requirements Viewer

## Purpose

- Problem: Requirements live in `docs/requirements/` today, but they are only browsable from the repo instead of inside the authenticated app where the rest of the product work happens.
- Outcome: Authenticated users can open an in-app requirements area, land on the requirements index by default, browse a left-hand file tree, and open linked requirement pages without leaving Aether.
- Notes: This requirement is for read-only viewing of the existing Markdown docs and their internal links, and it assumes the requirements-writing skill will be updated so doc metadata moves into frontmatter for easier extraction in the app.

## Current Reality

- Current behavior: Authenticated users can open `/requirements` to view `docs/requirements/index.md`, browse a left-hand tree generated from `docs/requirements/`, open linked requirement docs inside the app, and see frontmatter-backed metadata in the page chrome.
- Constraints: The source of truth remains the files in `docs/requirements/`; access must be limited to authenticated users; the viewer must support docs that link to each other; the navigation should reflect the folder structure in that directory; future metadata extraction should come from frontmatter instead of parsing body text.
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

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Authenticated route gating | done | Anonymous users are redirected before any requirements content is shown. | Inline |
| Requirements index landing | done | The top-level requirements route shows the index document by default. | Inline |
| Left-hand tree nav | done | The viewer shows a tree of folders and eligible subfolders from `docs/requirements/`, with the current document highlighted. | Inline |
| Linked document navigation | done | Clicking a nav item or an in-document link opens the target requirement page inside the same viewer flow. | Inline |
| Frontmatter-backed titles | done | Document titles and other top-level metadata are read from frontmatter instead of inferred from Markdown body content. | Inline |
| Markdown document rendering | done | Markdown docs display as readable content with headings, tables, code blocks, and inline links preserved. | Inline |
| Missing-document handling | done | Invalid or removed document paths fail gracefully instead of breaking the viewer route. | Inline |

## Detail

### Access control

- Requirement: The requirements viewer and any document-fetching path behind it must require a valid authenticated session.
- Notes: This matches the requested audience of any signed-in user, not only admins.
- Dependencies: Existing auth/session patterns used by other protected routes.
- Follow-up: Keep route protection consistent with other authenticated pages so the docs area does not become a special-case auth flow.

### Default route behavior

- Requirement: Opening the requirements area with no specific document selected must render the contents of `docs/requirements/index.md`.
- Notes: The current implementation uses `/requirements` for the default landing view and `/requirements/$` for opening specific requirement documents, including nested paths without the `.md` suffix.
- Dependencies: `docs/requirements/index.md` and the new app route structure.
- Follow-up: Decide whether canonical links inside docs should normalize to path slugs without the `.md` suffix.

### Left-hand navigation tree

- Requirement: The viewer must show a persistent left-hand navigation panel built from the folder and file structure under `docs/requirements/`.
- Notes: The tree should support nested folders from day one, but only show folders that contain at least one requirement file somewhere inside them, and should make the currently open document obvious.
- Dependencies: Server-side access to the `docs/requirements/` directory structure.
- Follow-up: Decide whether the tree should also expose folder-level summary labels if nested requirements become more numerous.

### Opening documents from nav and links

- Requirement: Users must be able to navigate between requirement docs by clicking either the left-hand tree or Markdown links inside the rendered document.
- Notes: In-document requirement links are normalized into the viewer route, while external links still behave as normal anchors.
- Dependencies: Markdown link parsing and a route format that can represent any document inside `docs/requirements/`.
- Follow-up: Normalize supported links to the requirement-doc set and define how non-requirements links should behave if they appear later.

### Frontmatter metadata and skill alignment

- Requirement: Requirement docs must store top-level metadata in frontmatter, and the requirements-writing skill must be updated to keep generating docs in that format.
- Notes: The immediate use case is extracting the document title for navigation and page chrome, but the same metadata can later support richer viewer presentation without brittle Markdown-body parsing.
- Dependencies: `docs/requirements/` document format and the `requirements-docs` skill/template workflow.
- Follow-up: Define the minimum frontmatter schema to standardize across all requirement docs, such as `title`, `status`, `owner`, `last_updated`, and `canonical_file`.

### Markdown rendering

- Requirement: The viewer must render requirement Markdown in a readable app-native layout.
- Notes: The current docs use headings, tables, inline code, and file links, and the viewer now maps the rendered HTML elements through custom `react-markdown` components with app-specific Tailwind styling.
- Dependencies: `react-markdown`, `remark-gfm`, and the viewer component styling.
- Follow-up: Decide which frontmatter fields should surface in the page chrome versus staying metadata-only.

### Missing or invalid document paths

- Requirement: If a requested requirement file does not exist, the viewer must show a clear not-found state within the authenticated app shell.
- Notes: This should cover stale links, renamed docs, and manual URL edits.
- Dependencies: Document lookup and route param validation.
- Follow-up: Consider whether the not-found state should offer a quick link back to the requirements index.

## Implementation Plan

| Step | Status | Plan |
| --- | --- | --- |
| 1. Frontmatter foundation | done | Requirement docs use frontmatter-backed metadata for navigation labels and page chrome. |
| 2. Document discovery layer | done | A server-side loader enumerates `docs/requirements/`, filters to Markdown files, keeps only folders with at least one file, and returns tree plus document metadata. |
| 3. Route structure | done | `/requirements` renders the default index view and `/requirements/$` handles nested docs. |
| 4. Markdown loading | done | Requested document paths are resolved inside `docs/requirements/`, parsed into frontmatter and body, and returned as normalized viewer payloads. |
| 5. Viewer layout | done | The authenticated page layout includes a persistent left nav tree, current-document highlighting, and a main Markdown content pane. |
| 6. Link normalization | done | In-document requirement links are normalized into the viewer route so navigation stays in-app. |
| 7. Not-found and edge states | done | Missing or invalid document paths show a clear not-found state with a link back to the requirements index. |
| 8. Polish and verification | done | The viewer has custom markdown element styling, wider layout tuning, and verified auth gating plus route transitions. |

### Implementation notes

- Start with a read-only server-backed viewer; do not couple the first pass to editing workflows.
- Treat frontmatter as the source for navigation labels and page chrome, while Markdown body remains the source for long-form content.
- Normalize document lookup so URLs cannot escape `docs/requirements/` through relative path traversal.
- Prefer route and path helpers for internal requirement links so future nested docs keep working when folder structure grows.

## Open Questions

- Should folders in the left nav stay always expanded, or should they become collapsible if the requirements tree grows?
- Do you want the viewer shell to promote any additional frontmatter fields beyond `title`, `status`, `owner`, and `last_updated`?

## Change Log

- 2026-03-14: Created the initial requirements doc for an authenticated in-app requirements viewer with index landing, linked document routing, and a left-hand file tree.
- 2026-03-14: Updated the doc to use `/requirements/$` document routing, require frontmatter-backed titles and metadata, align the requirements-writing skill with that format, and support nested folders that contain requirement files.
- 2026-03-14: Added an implementation plan covering frontmatter migration, document discovery, routing, rendering, link normalization, and edge-state handling.
- 2026-03-14: Migrated the requirements docs to frontmatter-backed metadata so the viewer can consume the same schema the skill now generates.
- 2026-03-14: Implemented the authenticated requirements viewer with `/requirements` index landing, nested document routing, frontmatter-backed metadata display, in-app link normalization, missing-document handling, and custom `react-markdown` styling.
