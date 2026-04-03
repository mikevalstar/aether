# Improvement Suggestions

Comprehensive code review findings organized by priority and category.

---

## 1. Critical Duplication

### 1.1 Path Normalization Utilities — 8 Identical Functions in Two Files

**Files:**
- `src/lib/obsidian.ts` (lines 97–158)
- `src/lib/requirements.ts` (lines 100–175)

**Details:** These functions are byte-for-byte identical across both files:
- `stripHashAndQuery()`
- `extractHash()`
- `safeDecodeURIComponent()`
- `hasProtocol()`
- `joinRelativePath()`
- `getRelativeDirectory()`
- `stripMarkdownSuffix()`
- `normalizeRelativePath()`

Additionally, the route helper functions (`toXRoutePath`, `normalizeXRoutePath`, `resolveXLinkTarget`) follow the same pattern and differ only in the base path prefix.

**Suggestion:** Extract all 8 utilities to `src/lib/path-utils.ts`. Create a factory for the route helpers that accepts a base path (e.g., `/o/` vs `/requirements/`).

---

### ~~1.2 Task Executor & Workflow Executor — ~75% Shared Code~~ ✅ DONE

**Files:**
- `src/lib/task-executor.ts` (268 lines)
- `src/lib/workflow-executor.ts` (284 lines)

**Duplicated sections:**
- `resolveModel()` / `resolveEffort()` — identical private functions
- Thread creation logic (lines 60–65 vs 62–72)
- `generateText()` call setup (lines 83–96 vs 94–107)
- Message/usage processing (lines 99–114 vs 109–124)
- Prisma transaction structure (lines 118–169 vs 128–180)
- Error handling (lines 192–249 vs 205–265)

**Suggestion:** Extract a shared `executePromptBased()` function that handles the common flow (resolve model → create thread → generate text → process usage → save to DB → handle errors) and accepts task/workflow-specific callbacks for the differences.

---

### ~~1.3 Prompt Placeholder Interpolation — Repeated 6+ Times~~ ✅ DONE

**Files:**
- `src/lib/task-executor.ts` (lines 71–74)
- `src/lib/workflow-executor.ts` (lines 78–81)
- `src/lib/ai-config.ts` (lines 50–52, 98–100, 108–110, 128–130, 138–140)

**Pattern repeated everywhere:**
```typescript
.replace(/\{\{date\}\}/g, formatIsoDate(new Date()))
.replace(/\{\{userName\}\}/g, userName)
.replace(/\{\{aiMemoryPath\}\}/g, aiMemoryPath)
```

**Suggestion:** Extract to `interpolatePromptPlaceholders(template, vars)` in a shared module.

---

### ~~1.4 Duplicate Zod Schemas~~ ✅ DONE

**`threadIdInputSchema` — defined identically in 3 files:**
- `src/lib/chat.functions.ts` (lines 29–31)
- `src/lib/task.functions.ts` (lines 17–19)
- `src/lib/workflow.functions.ts` (lines 19–21)

**`filenameInputSchema` — defined in 3 files:**
- `src/lib/ai-config.functions.ts` (lines 7–11)
- `src/lib/task.functions.ts` (lines 13–15)
- `src/lib/workflow.functions.ts` (lines 15–17)

**`queryInputSchema` — defined in 2 files:**
- `src/lib/command-palette.functions.ts` (lines 8–12)
- `src/lib/preferences.functions.ts` (lines 56–60)

**Suggestion:** Create `src/lib/shared-schemas.ts` with these common schemas exported once.

---

### ~~1.5 AI Config Validator Constants — Repeated in 4 Files~~ ✅ DONE

**Files:** `src/lib/ai-config-validators/task.ts`, `workflow.ts`, `task-prompt.ts`, `workflow-prompt.ts`

**Duplicated constants:**
```typescript
const validEfforts = ["low", "medium", "high"] as const;
const validNotificationLevels = ["silent", "notify", "push"] as const;
```

Also, the validation error formatting loop (`for (const issue of fmResult.error.issues)` → `${issue.path.join(".")}: ${issue.message}`) is repeated in every validator.

**Suggestion:** Create `src/lib/ai-config-validators/constants.ts` for shared values. Extract a `formatZodErrors(result)` utility.

---

## 2. Route-Level Patterns

### 2.1 Auth `beforeLoad` — Identical in 7+ Routes

**Files:** `chat.tsx`, `logs.tsx`, `usage.tsx`, `activity.tsx`, `users.tsx`, `dashboard.tsx`, `board.tsx`, and all settings routes.

**Repeated pattern:**
```typescript
beforeLoad: async () => {
  const session = await getSession();
  if (!session) throw redirect({ to: "/login" });
}
```

**Suggestion:** Extract to a reusable `authBeforeLoad` function or middleware.

---

### 2.2 Page Header Layout — Duplicated in 5+ Routes

**Files:** `logs.tsx`, `usage.tsx`, `activity.tsx`, `board.tsx`, `users.tsx`

**Repeated structure:**
- `<main className="relative overflow-hidden">` wrapper
- Dual `<GlowBg>` decorative elements
- `<div className="page-wrap relative px-4 pb-16 pt-10 sm:pt-12">`
- `<SectionLabel>` with icon
- `<h1 className="display-title ...">` with highlighted span
- Description `<p>`

**Suggestion:** Create a `<PageHeader icon={...} label="..." title="..." highlight="..." description="...">` component.

---

### 2.3 Settings Form Submission — Identical in 7 Settings Pages

**Files:** All `src/routes/settings/*.tsx` files.

**Repeated pattern:**
```typescript
const [isSaving, setIsSaving] = useState(false);
const handleSave = async (e) => {
  e.preventDefault();
  setIsSaving(true);
  try {
    await updateUserPreferences({ data: { ... } });
    toast.success("...");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Failed...");
  } finally {
    setIsSaving(false);
  }
};
```

**Suggestion:** Extract a `useSettingsMutation()` hook that handles loading state, try/catch, toast messages, and optional `router.invalidate()`.

---

### 2.4 Search Parameter Update Helper — Duplicated in 3 Routes

**Files:** `logs.tsx` (lines 74–84), `usage.tsx` (lines 71–81), `activity.tsx`

**Pattern:** `updateSearch()` function that normalizes values, builds search object, calls `navigate()` with `replace: true`.

**Suggestion:** Create a generic `useSearchParamUpdater()` hook.

---

### 2.5 Pagination Logic — Nearly Identical in 2 Routes

**Files:** `logs.tsx` (lines 336–390), `activity.tsx` (lines 169–223)

**Suggestion:** Extract a `<PaginationControls>` component or `usePagination()` hook.

---

## 3. Component Duplication

### 3.1 Empty State Components — 5+ Similar Implementations

| Component | File | Lines |
|-----------|------|-------|
| TaskEmptyState | `components/tasks/TaskEmptyState.tsx` | 15 |
| WorkflowEmptyState | `components/workflows/WorkflowEmptyState.tsx` | 16 |
| ObsidianMissingDocument | `components/obsidian/ObsidianMissingDocument.tsx` | 33 |
| MissingDocument (requirements) | `components/requirements/MissingDocument.tsx` | 33 |
| ObsidianWelcome | `components/obsidian/ObsidianWelcome.tsx` | 53 |

- TaskEmptyState and WorkflowEmptyState are structurally identical (dashed box pattern).
- MissingDocument and ObsidianMissingDocument are ~95% identical.

**Suggestion:** Create a generic `<EmptyState icon={...} title="..." description="..." action={...} />` base component.

---

### 3.2 Run History Components — 95% Identical

**Files:**
- `components/tasks/TaskRunHistory.tsx`
- `components/workflows/WorkflowRunHistory.tsx`

**Duplicated code:**
- `formatDateTime()` — identical inline implementation in both (lines 24–31 vs 23–30)
- `formatCost()` — identical in both (lines 34–36 vs 33–35)
- `RunDetail` sub-component — identical structure
- Table headers, expand/delete logic — identical

**Only difference:** WorkflowRunHistory has an extra "convert to chat" button.

**Suggestion:** Extract a generic `<RunHistoryTable>` component with an optional `extraActions` render prop. Move `formatDateTime` and `formatCost` to `src/lib/format.ts`.

---

### 3.3 `formatCost` — Defined in 3 Places

- `components/tasks/TaskRunHistory.tsx` (lines 34–36)
- `components/workflows/WorkflowRunHistory.tsx` (lines 33–35)
- `components/activity/ActivityDetailDialog.tsx` (lines 245–248)

**Suggestion:** Single export from `src/lib/format.ts`.

---

### 3.4 `EFFORT_LABELS` — Defined Twice

- `components/chat/ChatEmptyState.tsx` (lines 11–15)
- `components/chat/ChatHeader.tsx` (lines 27–31)

**Suggestion:** Export from `src/lib/chat-models.ts` or a shared constants file.

---

### 3.5 Model/Effort Selector — Duplicated Between ChatEmptyState and ChatHeader

`ChatEmptyState.tsx` (lines 67–98) duplicates the exact same model/effort dropdown UI from `ChatHeader.tsx` (lines 161–192).

**Suggestion:** Extract to a `<ModelEffortSelector>` component used in both places.

---

### 3.6 `formatRelativeTime` — Reimplemented in TaskTable

`components/tasks/TaskTable.tsx` (lines 21–38) reimplements the same logic that already exists in `components/activity/format-relative-time.ts`.

**Suggestion:** Import the existing shared implementation instead.

---

### 3.7 Tree Navigation — Overlapping Implementations

- `components/obsidian/ObsidianTreeNav.tsx` (404 lines) — full-featured with search, expand/collapse, localStorage persistence
- `components/requirements/TreeNav.tsx` (115 lines) — simpler, static, no search

These share the recursive tree-rendering concept but differ enough that a full merge isn't straightforward.

**Suggestion:** Extract a generic `<TreeRenderer>` for the recursive node rendering, keeping domain-specific features (search, persistence) in the wrappers.

---

### 3.8 Markdown Rendering — Two Systems

- `components/assistant-ui/markdown-text.tsx` — Uses `@assistant-ui/react-markdown`, 74 lines
- `components/markdown/markdown-components.tsx` — Generic factory with variants, 200+ lines

Both implement `useCopyToClipboard` independently.

**Suggestion:** Move `useCopyToClipboard` to `src/hooks/useCopyToClipboard.ts` and import from both.

---

### 3.9 Inconsistent Table Patterns

- `ActivityTable` uses raw `<table>` HTML elements
- `TaskTable` uses shadcn `Table` primitives

**Suggestion:** Standardize on shadcn `Table` components across all data tables.

---

## 4. Validation & Type Safety

### 4.1 Unsafe JSON Casts — No Validation After Parse

| File | Line | Cast |
|------|------|------|
| `lib/chat.ts` | 65 | `parsed as AppChatMessage[]` — only checks `Array.isArray()` |
| `lib/chat.ts` | 78 | `parsed as ChatUsageEntry[]` — same pattern |
| `lib/preferences.ts` | 22 | `JSON.parse(raw) as UserPreferences` — no validation |
| `lib/obsidian.functions.ts` | 178 | `parsed.data as Record<string, unknown>` — gray-matter data |
| `lib/workflow-watcher.ts` | 189 | `parsed.data as Record<string, unknown>` — gray-matter data |

**Suggestion:** Add Zod schemas to validate JSON-parsed data from the database and file system, rather than trusting `as` casts.

---

### 4.2 Prisma Authorization Pattern — Repeated 8+ Times

**Pattern repeated across `chat.functions.ts`, `task.functions.ts`, `workflow.functions.ts`, `activity.functions.ts`:**
```typescript
const session = await ensureSession();
const record = await prisma.someModel.findFirst({
  where: { id: data.id, userId: session.user.id }
});
if (!record) throw new Error("Not found");
```

**Suggestion:** Create helper functions like `ensureUserOwnsThread(threadId)` to reduce boilerplate and standardize error messages.

---

### 4.3 Inconsistent Error Messages

Same "not found" concept expressed differently:
- `"Not found"` (chat.functions.ts:157)
- `"Thread not found"` (chat.functions.ts:310)
- `"Task not found"` (task.functions.ts)
- `"User not found"` (user-management.functions.ts)

**Suggestion:** Use a consistent `NotFoundError` class or standardize on `"${Model} not found"` pattern.

---

### 4.4 Unnecessary `as` Casts After Zod Parse

`src/lib/chat-usage.functions.ts:80`:
```typescript
.inputValidator((data) => usageSearchInputSchema.parse(data) as UsageSearchInput)
```
The `as` cast is redundant — Zod's `.parse()` already returns the correctly typed value.

---

## 5. Architecture & Organization

### 5.1 Orphaned File

`src/integrations/better-auth/header-user.tsx` is not imported anywhere in the codebase.

**Suggestion:** Either integrate it into the app or remove it.

---

### 5.2 Chat Logic Spread Across 5 Files

- `src/lib/chat.ts` — types & utilities (171 lines)
- `src/lib/chat.functions.ts` — server functions (351 lines)
- `src/lib/chat-models.ts` — model definitions (145 lines)
- `src/lib/chat-usage.ts` — usage utilities (71 lines)
- `src/lib/chat-usage.functions.ts` — usage server functions (240 lines)

Related type definitions are split: `ChatTaskType` in `chat.ts` defines `"chat" | "title" | "task" | "workflow"` while `TaskType` in `chat-usage.ts` defines only `"chat" | "title"`.

**Suggestion:** This isn't necessarily wrong (server functions separate from types is a pattern), but the type divergence should be reconciled — `TaskType` should reference or extend `ChatTaskType`.

---

### 5.3 Plugin Lifecycle Hooks — Defined But Never Called

`AetherPluginServer` type (in `src/plugins/types.ts` lines 73–74) defines `onEnable()` and `onDisable()` hooks, but they are never invoked when plugins are toggled.

**Suggestion:** Either implement the lifecycle hook calls in the plugin toggle flow, or remove them from the type definition.

---

### 5.4 Unused Export — `isChatModel()`

`src/lib/chat-models.ts` (line 114) exports `isChatModel()` which is re-exported from `chat.ts` but never imported or called anywhere in the codebase.

**Suggestion:** Remove the dead code.

---

## 6. Quick Wins Summary

These changes are small, low-risk, and high-value:

| # | Change | Files Affected | Impact |
|---|--------|---------------|--------|
| 1 | Extract `formatCost`, `formatDateTime` to `lib/format.ts` | 3 components | Remove 3x duplication |
| 2 | Export `EFFORT_LABELS` from shared location | 2 components | Remove 2x duplication |
| 3 | Move `useCopyToClipboard` to `hooks/` | 2 components | Remove 2x duplication |
| 4 | Extract `threadIdInputSchema` to shared schemas | 3 lib files | Remove 3x duplication |
| 5 | Centralize validator constants | 4 validator files | Remove 4x duplication |
| 6 | Extract `authBeforeLoad` helper | 7+ routes | Remove 7x duplication |
| 7 | Import existing `formatRelativeTime` in TaskTable | 1 component | Remove reimplementation |
| 8 | Remove orphaned `header-user.tsx` | 1 file | Clean up |
| 9 | Remove unused `isChatModel()` | 1 file | Clean up |
| 10 | Extract `interpolatePromptPlaceholders()` | 3 files | Remove 6x duplication |

## 7. Medium Effort Improvements

| # | Change | Est. Scope |
|---|--------|-----------|
| 1 | Extract path utilities from obsidian.ts / requirements.ts | ~1 hour |
| 2 | Create shared executor base for task/workflow | ~2 hours |
| 3 | Create `<PageHeader>` component | ~1 hour |
| 4 | Create `useSettingsMutation()` hook | ~1 hour |
| 5 | Consolidate RunHistory components | ~1 hour |
| 6 | Create `<EmptyState>` base component | ~30 min |
| 7 | Add Zod validation for JSON-parsed DB data | ~2 hours |
| 8 | Create `<ModelEffortSelector>` component | ~30 min |
| 9 | Standardize ActivityTable on shadcn Table | ~1 hour |
