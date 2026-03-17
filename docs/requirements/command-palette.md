---
title: Command Palette
status: done
owner: Mike
last_updated: 2026-03-17
canonical_file: docs/requirements/command-palette.md
---

# Command Palette

## Purpose

- Problem: Navigating between pages, workflows, and obsidian documents requires clicking through menus and nav links. No keyboard-first way to quickly jump anywhere in the app.
- Outcome: `Cmd+K` opens a command palette that lets the user instantly navigate to any page, workflow, or obsidian document, and run common actions — all without touching the mouse.
- Notes: Data should lazy-load when the palette opens, not on page load. Reuses existing `cmdk` library and Shadcn `CommandDialog` component already in the project. Obsidian search reuses the existing vault index (fuse.js).

## Current Reality

- Current behavior: Command palette is fully implemented. `Cmd+K` / `Ctrl+K` opens a palette with page navigation, lazy-loaded workflows, debounced obsidian vault search, and quick actions. A search button with `⌘K` hint is shown in the header for authenticated users.
- Constraints: Single-user app, so no multi-tenant scoping needed. Vault index is server-side (fuse.js in memory), so obsidian search requires a server function call.
- Non-goals: Not a full spotlight/Alfred replacement. Not for running arbitrary shell commands. Not for in-page text search.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Keyboard shortcut | done | `Cmd+K` (Mac) / `Ctrl+K` (other) opens the palette from anywhere in the app |
| Page navigation | done | Static list of all major pages (Dashboard, Chat, Tasks, Workflows, Obsidian, Activity, Usage, Logs, Requirements, Settings, Users) |
| Workflow navigation | done | Lazy-loaded list of workflows from the `Workflow` table, navigates to `/workflows/:filename` |
| Obsidian document search | done | Lazy-loaded fuzzy search against the vault index, navigates to `/o/:path` |
| Quick actions | done | Common actions: New Chat, Toggle Theme, Sign Out |
| Lazy loading | done | Workflow list and obsidian search data fetched only when the palette opens, not on page load |
| Palette UI | done | Uses existing `CommandDialog` component with grouped sections and keyboard navigation |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Global keyboard listener | done | `Cmd+K` / `Ctrl+K` to toggle palette open/close | Inline |
| Static pages group | done | Hardcoded navigation items for all app routes | Inline |
| Workflows group | done | Lazy-fetched workflow list with titles | Inline |
| Obsidian search group | done | Fuzzy search against vault index, results appear as user types | Inline |
| Actions group | done | Quick actions (new chat, toggle theme, sign out) | Inline |
| Command palette component | done | Wrapper component mounted in root layout | Inline |

## Detail

### Global keyboard listener

- Mount a `useEffect` in the root layout (`__root.tsx`) or in the palette component itself that listens for `Cmd+K` / `Ctrl+K`.
- Toggles the `CommandDialog` open state.
- Only active when the user is authenticated.
- `Escape` closes the palette (built into `cmdk`).

### Static pages group

- Group label: "Pages"
- Items with icons matching the header nav:

| Label | Route | Icon |
| --- | --- | --- |
| Dashboard | `/dashboard` | `LayoutDashboard` |
| Chat | `/chat` | `MessageSquare` |
| Tasks | `/tasks` | `ListChecks` |
| Workflows | `/workflows` | `Workflow` |
| Obsidian | `/o` | `BookOpen` |
| Activity | `/activity` | `Activity` |
| Usage | `/usage` | `BarChart3` |
| Logs | `/logs` | `ScrollText` |
| Requirements | `/requirements` | `FileText` |
| Settings | `/settings/preferences` | `Settings` |
| Users | `/users` | `Users` (admin only) |

- These are always visible (no fetch needed), filtered by the search input via `cmdk`'s built-in filtering.

### Workflows group

- Group label: "Workflows"
- Data source: server function that returns workflow list (reuse or adapt existing workflow queries).
- Fetched lazily when the palette opens (not on mount). Cache the result for the session or until palette closes.
- Each item shows the workflow title, navigates to `/workflows/:filename`.
- Filtered by `cmdk`'s built-in search matching against the title.

### Obsidian search group

- Group label: "Obsidian"
- Unlike other groups, this uses server-side fuzzy search — not client-side `cmdk` filtering.
- Disable `cmdk`'s default filtering for this group (use `shouldFilter={false}` on the group or the whole command if needed).
- Debounced search (200–300ms) calls the existing vault search server function as the user types.
- Show top ~10 results with title and folder path.
- Each item navigates to `/o/:relativePath`.
- Results only appear when there's a search query (no preloaded list — vault could be huge).

### Actions group

- Group label: "Actions"
- Static list of quick actions:

| Label | Action | Icon |
| --- | --- | --- |
| New Chat | Navigate to `/chat` + trigger new thread (or just `/chat?new=1`) | `Plus` |
| Toggle Theme | Toggle light/dark via the existing Jotai theme atom | `Sun` / `Moon` |
| Sign Out | Call `authClient.signOut()` + redirect to `/login` | `LogOut` |

### Command palette component

- Component: `src/components/CommandPalette.tsx`
- Uses `CommandDialog`, `CommandInput`, `CommandList`, `CommandGroup`, `CommandItem`, `CommandShortcut` from `src/components/ui/command.tsx`.
- Mounted once in `__root.tsx` (only rendered when authenticated).
- State: `open` boolean, toggled by keyboard shortcut.
- On item select: navigate using TanStack Router's `useNavigate()`, then close the palette.
- Search input placeholder: "Type a command or search..."
- Show `Cmd+K` hint somewhere accessible (e.g., in the header as a subtle button/badge that also opens the palette on click).

### Lazy loading strategy

- On palette open (`open` changes to `true`):
  1. Fetch workflow list (if not already cached).
  2. Obsidian results are not prefetched — they load as the user types (debounced server call).
- On palette close: optionally clear obsidian search results to keep memory light. Workflow cache can persist.
- Loading states: show a subtle spinner or "Loading..." text in each group while fetching.

## Open Questions

- Should recent/frequent pages be shown as a "Recent" group at the top?

## Resolved Questions

- Header shows a visible `⌘K` search button as an affordance (desktop only, authenticated users).

## Change Log

- 2026-03-17: Initial requirements draft
- 2026-03-17: Full implementation complete — all major requirements and sub-features done
