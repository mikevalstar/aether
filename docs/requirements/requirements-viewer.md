# Requirements Viewer

- Status: todo
- Owner: self
- Last updated: 2026-03-14
- Canonical file: `docs/requirements/requirements-viewer.md`

## Purpose

- Problem: Requirements live in `docs/requirements/` today, but they are only browsable from the repo instead of inside the authenticated app where the rest of the product work happens.
- Outcome: Authenticated users can open an in-app requirements area, land on the requirements index by default, browse a left-hand file tree, and open linked requirement pages without leaving Aether.
- Notes: This requirement is for read-only viewing of the existing Markdown docs and their internal links, and it assumes the requirements-writing skill will be updated so doc metadata moves into frontmatter for easier extraction in the app.

## Current Reality

- Current behavior: Requirements are stored as Markdown files under `docs/requirements/`, with `index.md` linking to individual feature docs, and there is no in-app route for viewing them; top-level document metadata currently lives in Markdown body bullets rather than frontmatter.
- Constraints: The source of truth remains the files in `docs/requirements/`; access must be limited to authenticated users; the viewer must support docs that link to each other; the navigation should reflect the folder structure in that directory; future metadata extraction should come from frontmatter instead of parsing body text.
- Non-goals: In-app editing, public access, arbitrary Markdown browsing outside `docs/requirements/`, document version history, and full docs-site features such as search or comments are not part of this requirement.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Access control | todo | Only authenticated users can load the requirements viewer and its document content. |
| Default entry point | todo | The requirements route must open the `docs/requirements/index.md` content by default. |
| File-tree navigation | todo | The viewer must render a left-hand navigation tree based on the files and folders under `docs/requirements/`. |
| Document routing | todo | Users must be able to open individual requirement pages from the tree and via links inside documents. |
| Frontmatter metadata | todo | Requirement docs and the writing skill must expose key document metadata in frontmatter so the viewer can extract titles and supporting details cleanly. |
| Markdown presentation | todo | Requirement docs must render cleanly in-app as readable linked Markdown content. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Authenticated route gating | todo | Anonymous users are redirected before any requirements content is shown. | Inline |
| Requirements index landing | todo | The top-level requirements route shows the index document by default. | Inline |
| Left-hand tree nav | todo | The viewer shows a tree of folders and eligible subfolders from `docs/requirements/`, with the current document highlighted. | Inline |
| Linked document navigation | todo | Clicking a nav item or an in-document link opens the target requirement page inside the same viewer flow. | Inline |
| Frontmatter-backed titles | todo | Document titles and other top-level metadata are read from frontmatter instead of inferred from Markdown body content. | Inline |
| Markdown document rendering | todo | Markdown docs display as readable content with headings, tables, code blocks, and inline links preserved. | Inline |
| Missing-document handling | todo | Invalid or removed document paths fail gracefully instead of breaking the viewer route. | Inline |

## Detail

### Access control

- Requirement: The requirements viewer and any document-fetching path behind it must require a valid authenticated session.
- Notes: This matches the requested audience of any signed-in user, not only admins.
- Dependencies: Existing auth/session patterns used by other protected routes.
- Follow-up: Keep route protection consistent with other authenticated pages so the docs area does not become a special-case auth flow.

### Default route behavior

- Requirement: Opening the requirements area with no specific document selected must render the contents of `docs/requirements/index.md`.
- Notes: The route shape should use `/requirements` for the default landing view and `/requirements/$` for opening specific requirement documents, including nested paths.
- Dependencies: `docs/requirements/index.md` and the new app route structure.
- Follow-up: Decide whether canonical links inside docs should normalize to path slugs without the `.md` suffix.

### Left-hand navigation tree

- Requirement: The viewer must show a persistent left-hand navigation panel built from the folder and file structure under `docs/requirements/`.
- Notes: The tree should support nested folders from day one, but only show folders that contain at least one requirement file somewhere inside them, and should make the currently open document obvious.
- Dependencies: Server-side or build-time access to the `docs/requirements/` directory structure.
- Follow-up: Decide whether the tree should also expose folder-level summary labels if nested requirements become more numerous.

### Opening documents from nav and links

- Requirement: Users must be able to navigate between requirement docs by clicking either the left-hand tree or Markdown links inside the rendered document.
- Notes: Because the requirement docs are already linked together, in-document links should resolve into the same route/viewer instead of sending users out of the app or breaking on raw repo-relative paths.
- Dependencies: Markdown link parsing and a route format that can represent any document inside `docs/requirements/`.
- Follow-up: Normalize supported links to the requirement-doc set and define how non-requirements links should behave if they appear later.

### Frontmatter metadata and skill alignment

- Requirement: Requirement docs must store top-level metadata in frontmatter, and the requirements-writing skill must be updated to keep generating docs in that format.
- Notes: The immediate use case is extracting the document title for navigation and page chrome, but the same metadata can later support richer viewer presentation without brittle Markdown-body parsing.
- Dependencies: `docs/requirements/` document format and the `requirements-docs` skill/template workflow.
- Follow-up: Define the minimum frontmatter schema to standardize across all requirement docs, such as `title`, `status`, `owner`, `last_updated`, and `canonical_file`.

### Markdown rendering

- Requirement: The viewer must render requirement Markdown in a readable app-native layout.
- Notes: The current docs use headings, tables, inline code, and file links, so those formats need to remain legible in the app; the viewer can also use extracted frontmatter to improve surrounding page presentation.
- Dependencies: Existing Markdown rendering patterns in the chat UI may be reusable.
- Follow-up: Decide which frontmatter fields should surface in the page chrome versus staying metadata-only.

### Missing or invalid document paths

- Requirement: If a requested requirement file does not exist, the viewer must show a clear not-found state within the authenticated app shell.
- Notes: This should cover stale links, renamed docs, and manual URL edits.
- Dependencies: Document lookup and route param validation.
- Follow-up: Consider whether the not-found state should offer a quick link back to the requirements index.

## Open Questions

- Should the viewer URL omit `.md` from navigable document paths, or should route params mirror the file paths exactly?
- Besides `title`, which frontmatter fields should be visually promoted in the viewer shell on first implementation?
- Should folders in the left nav be manually collapsible, or always expanded for the initial release?

## Change Log

- 2026-03-14: Created the initial requirements doc for an authenticated in-app requirements viewer with index landing, linked document routing, and a left-hand file tree.
- 2026-03-14: Updated the doc to use `/requirements/$` document routing, require frontmatter-backed titles and metadata, align the requirements-writing skill with that format, and support nested folders that contain requirement files.
