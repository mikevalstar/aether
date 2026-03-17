---
name: lifecycle-docs
description: Write or update lifecycle documentation in `docs/` that traces a feature's full journey through the codebase — from input to storage to scheduling to execution to UI. Use this skill whenever the user asks to "write a lifecycle doc", "document the lifecycle", "create a lifecycle reference", or "update the lifecycle docs" for any feature or system in the project. Only trigger on explicit lifecycle documentation requests, not general docs or requirements work.
---

# Lifecycle Documentation Skill

Write lifecycle documents that serve as **navigational maps into the codebase**. The docs are reference material — the code is the source of truth, and the lifecycle doc helps someone get up to speed quickly by showing how the pieces connect and where to look.

## When to use

Only when the user explicitly asks for a lifecycle document to be created or updated. Not for requirements, decision records, or general documentation.

## Output location

All lifecycle docs go in `docs/` at the project root, named `{feature}-lifecycle.md` (e.g., `task-lifecycle.md`, `chat-lifecycle.md`, `workflow-lifecycle.md`).

## Research phase

Before writing, thoroughly read all files involved in the feature's lifecycle. The goal is to understand the complete journey, so trace the feature across these layers:

1. **Data model** — Prisma schema, types, interfaces
2. **Validation** — Zod schemas, validators, config parsers
3. **Backend logic** — Schedulers, executors, processors, server functions
4. **API layer** — Server functions (`createServerFn`), route handlers
5. **UI components** — Tables, forms, detail views, empty states
6. **Routes** — Page routes that wire it all together
7. **Side effects** — Notifications, activity logging, usage tracking, cleanup jobs

Use the Explore agent or read files directly. Don't guess at implementation details — verify them in the code.

## Document structure

Follow this structure. Every section should reference specific files so a reader can jump straight to the code.

### Title & Overview

```markdown
# {Feature} Lifecycle

{One sentence describing what this document covers.}

## Overview

{2-3 sentences explaining what the feature is, where its configuration lives, and the high-level flow. Set the mental model before diving into details.}
```

### Key Files table

Immediately after the overview, provide a table of every file involved. This is the most important part of the doc — it's the map.

```markdown
## Key Files

| Area | File | Purpose |
|------|------|---------|
| **Schema** | `prisma/schema.prisma` (model `X`) | ... |
| **Validation** | `src/lib/...` | ... |
| **Backend** | `src/lib/...` | ... |
| **Server functions** | `src/lib/....functions.ts` | ... |
| **UI — list** | `src/components/...` | ... |
| **Route** | `src/routes/...` | ... |
```

Group by area (Schema, Validation, Backend, Server functions, UI, Route). Use bold for the area labels. Include every file that plays a meaningful role — err on the side of completeness.

### Numbered lifecycle sections

Walk through the feature's journey in chronological/logical order. Number the sections so readers can reference them easily (e.g., "see section 3").

Each section should:

- **Name the entry point** — which function or file starts this phase
- **Describe the sequence** — numbered steps for multi-step processes
- **Reference specific functions** — `functionName()` in `path/to/file.ts`
- **Include config/format examples** — YAML frontmatter, JSON structures, etc. when the feature has a user-facing format
- **Use tables for structured info** — field descriptions, event handlers, status mappings
- **Call out non-obvious behavior** — guards, fallbacks, edge cases, defaults

Example of good detail level:

```markdown
## 3. Cron Job Creation

`createCronJob()` in `src/lib/task-scheduler.ts` handles three scenarios:

### Disabled tasks
Creates a **paused** cron job (`{ paused: true }`) so that `nextRun()` still returns a value for display in the UI, but the callback never fires.

### Restart guard
When the app restarts, there's a risk of double-running a task that just fired. The guard works by:
1. Taking the task's `lastRunAt` from the DB
2. Computing what the next scheduled run after that time would be
3. If that next run is in the past but within the **grace window** (60 seconds)...
```

### Typical section topics

Not every feature will have all of these, but consider each:

1. **Input format** — file format, frontmatter schema, validation rules
2. **Initialization** — how the system discovers and loads instances of this feature
3. **Scheduling / triggering** — what causes the feature to activate (cron, user action, event)
4. **Execution** — the core logic: what happens when it runs
5. **Success / failure paths** — what gets stored, what gets notified
6. **Manual trigger** — if users can trigger it outside the normal flow
7. **Data model** — DB tables, key fields, relationships
8. **Cleanup / maintenance** — system tasks, garbage collection
9. **Shutdown / teardown** — graceful cleanup on process exit
10. **UI layer** — pages, components, what they display
11. **Configuration hierarchy** — if settings come from multiple levels with priority

### Configuration hierarchy (if applicable)

If the feature has layered configuration (per-instance overrides, shared defaults, system fallbacks), end with a clear priority list:

```markdown
## Configuration Hierarchy

1. **Per-instance config** — highest priority
2. **Shared config file** — defaults
3. **System defaults** — fallback
```

## Writing principles

- **File references are the point.** Every claim about behavior should point to a file. The reader should never wonder "where is this code?"
- **Chronological flow.** Walk through the lifecycle in the order things actually happen, not grouped by abstraction layer.
- **Specific function names.** Say `parseTaskFile()` in `src/lib/task-scheduler.ts`, not "the parsing logic."
- **Include code examples for user-facing formats.** If users write YAML frontmatter or config files, show the full format with comments.
- **Tables over prose for structured data.** Field descriptions, event mappings, status values — use tables.
- **Non-obvious behavior deserves explanation.** Restart guards, grace windows, fallback chains — explain the why, not just the what.
- **Keep it scannable.** Bold key terms on first use. Use sub-headings liberally. A reader skimming the headings should get the gist.
- **Don't duplicate the code.** Describe what happens and where to find it. Don't paste large code blocks — the reader can go look at the file.

## Updating an existing lifecycle doc

When updating rather than creating:

1. Re-read all files referenced in the Key Files table to check for changes
2. Search for new files that should be added (new components, new server functions, schema changes)
3. Update sections affected by the changes
4. Add any new sections needed
5. Verify all file references are still accurate — files may have moved or been renamed
