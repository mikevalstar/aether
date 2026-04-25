# Aether Redesign — Component Audit

Inventory of `src/components/` ahead of the Phase 2 shared-shell pass. Captures what exists, what's reused, and what should be extracted before the page-by-page redesigns in Phase 3.

Source: walked every file under `src/components/` (~125 files across 16 folders) and the importing routes under `src/routes/`. Reuse counts are import counts derived from grep across `src/`.

---

## 1. TL;DR

- **Well-reused primitives:** the entire `ui/` Shadcn set, `PageHeader` (9 routes), `EmptyState`, `PaginationControls`, `RunHistoryTable`, `ConfigEditorShell`.
- **Hidden duplication:** detail-page shells (`tasks/$`, `workflows/$`, `triggers/$` — same wrapper, copy-pasted), settings forms (`settings/*` — identical `<form className="surface-card p-6">` wrapper), filter toolbars (`notifications`, `activity` — independent re-implementations).
- **Recommended extractions for Phase 2:** `DetailPageShell`, `SettingsFormSection`, `FilterBar`, `ListPageShell`. Two more (`RunHistorySection` rename, `EmptyStateCard` consolidation) are nice-to-haves, lower priority.

Estimated reduction: ~400 LOC of repeated layout wrapper across ~12 routes. More importantly, every new list / detail / settings page lands faster and looks consistent.

---

## 2. Folder inventory

| Folder | Files | Role | Reuse profile |
|---|---|---|---|
| `ui/` | ~50 | Shadcn primitives + a few project extensions (`stat-card`, `chart-card`, `feature-card`, `markdown-editor`, `glow-bg`, `section-label`, `user-picker`) | All reusable. `markdown-editor` and `chart-card` are the heaviest non-Shadcn additions. |
| `shared/` | 2 | `RunHistoryTable`, `RunMessages` | Both reusable, well-parameterized. Underused folder — should grow. |
| `chat/` | ~5 | `ChatWorkspace`, `ChatHeader`, `ChatThreadItem`, `ChatEmptyState` | Page-specific to `/chat`. |
| `dashboard/` | ~5 | `DashboardGrid`, `ActivityDigest`, `NotificationWidget`, etc. | Page-specific to `/dashboard`. |
| `tasks/` | 3 | `TaskTable`, `TaskEmptyState`, `TaskRunHistory` | `TaskRunHistory` is a thin wrapper over `RunHistoryTable`. |
| `workflows/` | 4 | `WorkflowCard`, `WorkflowForm`, `WorkflowEmptyState`, `WorkflowRunHistory` | Same wrapper pattern as tasks. |
| `triggers/` | 4 | `TriggerTable`, `TriggerEmptyState`, `TriggerRunHistory`, `WebhookManager` | Same wrapper pattern as tasks. |
| `activity/` | 4 | `ActivityTable`, `ActivityDetailDialog`, etc. | Page-specific. Detail dialog reuses `RunMessages`. |
| `calendar/` | 5 | `CalendarWidget`, `CalendarEventDialog`, `DayDetailPanel` | Page-specific to settings + dashboard. |
| `board/` | 4 | `BoardView`, `BoardColumn`, `BoardTask` | Plugin page (`/p/board`). |
| `obsidian/` | 6 | `ObsidianEditor`, `ObsidianViewer`, `TreeNav` | Page-specific to `/o`. |
| `requirements/` | 5 | `RequirementsViewer`, `TreeNav`, `DocumentHeader` | Page-specific to `/requirements`. Note: separate `TreeNav` from `obsidian/` — possible consolidation candidate. |
| `config-editor/` | 13 | `ConfigEditorShell` + frontmatter displays + `CronBuilder` + dialogs | `ConfigEditorShell` is the single most reused composite component (8 imports across tasks/workflows/triggers). Exemplary. |
| `mentions/` | 2 | `MentionTextarea`, `MentionPopover` | Reusable across chat + form fields. |
| `markdown/` | 1 | `markdown-components.tsx` (renderers for ReactMarkdown) | Reusable. |
| `assistant-ui/` | ~9 | Custom render layer for `@assistant-ui/react` | Reusable across chat surfaces. |
| Root | 6 | `PageHeader`, `EmptyState`, `PaginationControls`, `Header`, `Footer`, `AppLogo`, `CommandPalette`, `CommandKButton`, `NotificationBell`, `ThemeProvider`, `ThemeToggle` | App-shell layer. All reusable. |

---

## 3. Pattern deep-dives

### 3.1 List + toolbar pattern (HIGH duplication)

**Routes that own a list page:** `/tasks`, `/workflows`, `/triggers`, `/notifications`, `/activity`, `/usage`, `/logs`, `/scheduled-notifications`, `/users`, `/chat` (thread list).

**What's shared today:** all use `PageHeader` for the top section. That's it.

**What's not shared:**
- **Filter UI** is reinvented per page. `notifications.tsx` rolls its own status segmented buttons + level + category dropdowns + bulk-action toolbar. `activity.tsx` rolls its own type-button row. `usage.tsx` rolls its own date-range picker + model filter. None share components.
- **Pagination wiring** — `PaginationControls` exists and is used, but each page wires URL search-params to it independently.
- **Empty state** — each route has its own per-domain `*EmptyState` wrapper around the shared `EmptyState`.

**Extraction candidate:** `FilterBar` (see §5) — declarative filter definitions (`{ type: 'segmented' | 'dropdown' | 'search' | 'date-range', key, options, label }`) + an optional bulk-action slot. ~50 LOC saved per adopting page.

### 3.2 List/detail/editor triad (HIGH duplication on detail; editor already shared)

**Domains:** `tasks`, `workflows`, `triggers` — each has list (`/foo`), detail (`/foo/$`), and editor (`/foo/editor`).

**Editor — already shared.** `config-editor/ConfigEditorShell.tsx` is reused across all three editors, plus frontmatter renderer dialogs. This is the model to copy.

**Detail — copy-paste.** `routes/tasks/$.tsx`, `routes/workflows/$.tsx`, `routes/triggers/$.tsx` all open with the same shell:

```tsx
<main className="relative overflow-hidden">
  <GlowBg color="var(--teal)" size="size-[500px]" position="-right-48 -top-48" />
  <div className="page-wrap relative px-4 pb-16 pt-10 sm:pt-12">
    <Link to="/{entity}" className="inline-flex items-center gap-1 ...">
      <ArrowLeft className="size-4" /> Back to {entity}
    </Link>
    <section className="mb-8">
      <SectionLabel icon={Icon} color="text-[var(--teal)]">{label}</SectionLabel>
      <h1 className="display-title ...">{data.title}</h1>
    </section>
    {/* domain-specific body — typically: metadata, then a *RunHistory wrapper */}
  </div>
</main>
```

The body diverges (workflows render `WorkflowForm`; tasks/triggers render run history directly), but the shell is identical.

**Extraction candidate:** `DetailPageShell` (see §5).

### 3.3 Settings form pattern (HIGH duplication)

**Routes:** `/settings/profile`, `/settings/chat`, `/settings/password`, `/settings/notifications`, `/settings/calendar`, `/settings/obsidian`, `/settings/plugins/$pluginId`.

**Shared:** the parent `/settings/route.tsx` provides the sidebar nav + outlet shell. ✓

**Repeated:** every leaf page wraps its form in:

```tsx
<form className="surface-card p-6">
  <h2 className="mb-4 text-lg font-semibold">{Title}</h2>
  <div className="grid gap-4">
    {/* fields */}
    <Button type="submit" disabled={isSaving}>
      {isSaving ? "Saving..." : "Save {entity}"}
    </Button>
  </div>
</form>
```

**Extraction candidate:** `SettingsFormSection` (see §5) — wraps the form element, title, `isSaving` button state, and renders fields as children. Optionally takes a `description` slot. ~40 LOC saved per page × 6 pages.

### 3.4 Run history (LOW duplication — already good)

**`shared/RunHistoryTable`** is well-designed: takes runs + handlers, handles expand-row UI, delete, "convert to chat" actions, token/cost display.

**`tasks/TaskRunHistory`, `workflows/WorkflowRunHistory`, `triggers/TriggerRunHistory`** are thin adapter wrappers (~20 LOC each) that bind the right server functions and pass a typed `runs` array.

**Recommendation:** keep the wrapper pattern. Optionally rename to a generic `RunHistorySection` with a `kind: 'task' | 'workflow' | 'trigger'` discriminator — but this is a polish step, not a blocker. **Low priority.**

### 3.5 Markdown surfaces (NO duplication)

Three distinct concerns, no overlap:
- `ui/markdown-editor.tsx` — Monaco/CodeMirror-style editor for raw markdown (used by `obsidian/ObsidianEditor` + `config-editor/ConfigEditorShell`).
- `markdown/markdown-components.tsx` — react-markdown renderer mappings (typography, code blocks, etc.). Consumed by `assistant-ui/MarkdownText`, `requirements/RequirementsViewer`, `obsidian/ObsidianViewer`.
- `shared/RunMessages.tsx` — parses chat-message JSON envelopes (text / tool-call / tool-result blocks) and renders each. Different shape entirely.

**Recommendation:** none. Surfaces are already factored well.

### 3.6 Page header pattern (GOOD adoption, partial coverage)

**`PageHeader`** is used on every list page (9 routes). It accepts icon, label, title, color, description, action button, and renders decorative glows. Solid component.

**Gap:** detail pages (`/tasks/$`, `/workflows/$`, `/triggers/$`) don't use it — they hand-roll `GlowBg` + `SectionLabel` + `h1`. The proposed `DetailPageShell` (§5) closes this gap and lets us either consume `PageHeader` internally or extend it with a "back link" prop.

### 3.7 Tree navigation (POSSIBLE small dedupe)

`obsidian/TreeNav.tsx` and `requirements/TreeNav.tsx` are independent implementations of recursive folder/file navigators. Visual idiom is similar; data model differs. **Low priority** — leave for now, revisit only if a third tree appears.

---

## 4. Reuse counts (top 20)

Approximate import counts inside `src/`:

| Component | Imports | Notes |
|---|---|---|
| `ui/button` | 80+ | — |
| `ui/card` | 50+ | — |
| `ui/input` | 40+ | — |
| `ui/dialog` | 30+ | — |
| `ui/badge` | 25+ | — |
| `PageHeader` | 9 | All list pages. |
| `ConfigEditorShell` | 8 | All three editor routes + their dialogs. |
| `EmptyState` | 13 | Direct + via per-domain wrappers. |
| `GlowBg` | 12 | Detail pages + page headers. |
| `SectionLabel` | 11 | Detail pages + section headings. |
| `RunHistoryTable` | 3 | Task/Workflow/Trigger wrappers. |
| `RunMessages` | 1 | `ActivityDetailDialog` only (under-leveraged). |
| `markdown-components` | 4 | Viewer surfaces. |
| `markdown-editor` | 2 | `ObsidianEditor`, `ConfigEditorShell`. |
| `PaginationControls` | 6 | List pages with pagination. |
| `ThemeProvider` / `ThemeToggle` | 1 / 2 | App shell. |
| `CommandPalette` | 1 | Mounted in `__root`. |
| `NotificationBell` | 1 | Header. |
| `MentionTextarea` | 3 | Chat composer + a couple forms. |

---

## 5. Recommended extractions for Phase 2

Ordered by ROI (impact × routes touched / effort).

### 5.1 `DetailPageShell` ⭐ highest impact

**Consolidates:** `routes/tasks/$.tsx`, `routes/workflows/$.tsx`, `routes/triggers/$.tsx` (and any future detail page).

**API sketch:**

```tsx
<DetailPageShell
  icon={ListChecks}
  label="Periodic"
  title={task.title}
  backLink={{ to: "/tasks", label: "Back to tasks" }}
  // optional: description, action button slot, accent glow color (defaults to --accent)
>
  {/* domain body */}
</DetailPageShell>
```

**Saves:** ~30 LOC × 3 routes = ~90 LOC, plus enforces consistency on future detail pages (calendar event detail, plugin run detail, etc).

### 5.2 `SettingsFormSection` ⭐ highest impact

**Consolidates:** all 6 leaf settings routes plus per-plugin settings.

**API sketch:**

```tsx
<SettingsFormSection
  title="Profile"
  description="How you appear in Aether."
  onSubmit={handleSave}
  isSaving={isSaving}
  submitLabel="Save profile"
>
  <Field label="Name"><Input ... /></Field>
  <Field label="Email"><Input ... /></Field>
</SettingsFormSection>
```

**Saves:** ~40 LOC × 6 routes ≈ 240 LOC. Normalizes save-button state, error toasts (push into the shell), and keyboard submit.

### 5.3 `FilterBar`

**Consolidates:** `routes/notifications.tsx`, `routes/activity.tsx`, eventually `usage`, `logs`.

**API sketch:**

```tsx
<FilterBar
  filters={[
    { type: "segmented", key: "status", label: "Status", options: [{ value: "unread", label: "Unread" }, ...] },
    { type: "dropdown", key: "level", label: "Level", options: [...] },
    { type: "search", key: "q", placeholder: "Search…" },
  ]}
  value={filterState}
  onChange={setFilterState}
  bulkActions={selectedIds.length > 0 ? [{ label: "Mark read", onClick: ... }] : []}
/>
```

Keep state external (URL search params, Jotai atom) — the component is presentational.

**Saves:** ~50 LOC × 2 routes today + accelerates every future list page.

### 5.4 `ListPageShell` (medium priority)

**Consolidates:** the very top of every list page — `PageHeader` + filter slot + content slot + pagination slot.

**API sketch:**

```tsx
<ListPageShell
  header={<PageHeader ... />}
  filters={<FilterBar ... />}
  pagination={<PaginationControls ... />}
>
  {items.length === 0 ? <EmptyState ... /> : <Table ... />}
</ListPageShell>
```

**Trade-off:** light wrapper; could be skipped if `PageHeader` + `FilterBar` already cover 80% of the value. **Reassess after 5.1 + 5.3 land.**

### 5.5 `RunHistorySection` (low priority — rename + light refactor)

**Consolidates:** `TaskRunHistory`, `WorkflowRunHistory`, `TriggerRunHistory` into one generic `RunHistorySection` with a `kind` discriminator.

**Saves:** ~60 LOC. Cosmetic — only worth doing if Phase 4 cleanup time allows.

### 5.6 `EmptyStateCard` (low priority — defer)

Keep per-domain wrappers (`TaskEmptyState`, etc.) because their semantic naming aids reading. Revisit only if the count balloons past ~6.

---

## 6. Tokens / styling debt revealed by the audit

These should be cleaned up alongside the Phase 1 token swap, not invented in Phase 2:

- **Hard-coded `var(--teal)` references** in `GlowBg` color props on detail pages — will rename to `var(--accent)` after AETH-vzlzgjoc lands.
- **`surface-card` utility class** is used in settings forms but defined as a custom utility in `styles.css`. Stays valid; ensure it's covered by the new tokens (maps to `--surface` + `--line` + `--shadow-sm`).
- **`display-title` utility** used on detail-page headings — confirm it points to `--font-display` after font swap (AETH-yqekrpfr).

---

## 7. Out of scope for Phase 0

Things noticed but not acted on here:

- Storybook coverage gaps (StaticCard, RunHistoryTable, FilterBar-to-be) — handled in AETH-mbqoxbsi (Phase 4).
- Plugin-page consistency (`/p/board`) — handled per-plugin in Phase 3.
- Accessibility audit of components (focus states, ARIA labelling on filter dropdowns) — handled in AETH-wxllcgzf (Phase 4).
