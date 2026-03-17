# Workflow Lifecycle

How user-defined AI workflows are discovered, configured, triggered, executed, and tracked.

## Overview

Workflows are **user-triggered AI tasks** defined as Markdown files with YAML frontmatter. Each workflow defines a prompt template with form fields that the user fills in before running. The system watches the workflows directory for file changes, syncs definitions to the database, and executes them as background AI calls via the Anthropic API. Results are stored as `ChatThread` records with full usage tracking.

## Key Files

| Area | File | Purpose |
|------|------|---------|
| **Schema** | `prisma/schema.prisma` (model `Workflow`) | DB model — title, fields, run status, file tracking |
| **Schema** | `prisma/schema.prisma` (model `ChatThread`) | Stores execution results with `type: "workflow"` |
| **Validation** | `src/lib/ai-config-validators/workflow.ts` | Validates workflow frontmatter and body |
| **Validation** | `src/lib/ai-config-validators/workflow-prompt.ts` | Validates shared `workflow-prompt.md` system prompt |
| **Config reader** | `src/lib/ai-config.ts` | `readWorkflowPromptConfig()` — loads system prompt with placeholder substitution |
| **File watcher** | `src/lib/workflow-watcher.ts` | Watches workflows directory, parses files, syncs to DB |
| **Executor** | `src/lib/workflow-executor.ts` | Runs workflow against Anthropic API, stores results |
| **Server functions** | `src/lib/workflow.functions.ts` | CRUD + run trigger for the UI |
| **Notifications** | `src/lib/notify.ts` | Post-execution notifications (in-app + Pushover) |
| **System cleanup** | `src/lib/system-tasks.ts` | Hourly cleanup of stale `Workflow` rows |
| **UI — list** | `src/components/workflows/WorkflowCard.tsx` | Workflow summary card for index page |
| **UI — empty** | `src/components/workflows/WorkflowEmptyState.tsx` | Shown when no workflows exist |
| **UI — form** | `src/components/workflows/WorkflowForm.tsx` | Dynamic form rendered from field definitions |
| **UI — history** | `src/components/workflows/WorkflowRunHistory.tsx` | Expandable table of past runs with messages |
| **Route — index** | `src/routes/workflows/index.tsx` | `/workflows` — list all workflows |
| **Route — detail** | `src/routes/workflows/$.tsx` | `/workflows/$filename` — form + run history |
| **Example** | `examples/ai-config/workflows/url-to-recipe.md` | Sample workflow file |
| **Example** | `examples/ai-config/workflow-prompt.md` | Sample shared system prompt |

## 1. Workflow File Format

Workflow definitions live as `.md` files in `{OBSIDIAN_DIR}/{OBSIDIAN_AI_CONFIG}/workflows/`. Each file has YAML frontmatter and a prompt body:

```yaml
---
title: URL to Recipe          # required — display name
description: Extract a recipe # optional
model: claude-haiku-4-5       # optional — overrides default
effort: low                   # optional — low | medium | high
maxTokens: 4096               # optional — positive integer
notification: notify          # optional — silent | notify | push (default: notify)
fields:                       # required — at least one field
  - name: url                 # used as {{url}} placeholder in body
    label: Recipe URL
    type: url                 # text | textarea | url | select (default: text)
    required: true            # default: true
    placeholder: https://...
  - name: style
    label: Cuisine Style
    type: select
    options: [Italian, Mexican, Japanese]
    default: Italian
---

Extract the recipe from {{url}} and format it for my collection.
Adapt the style to {{style}} cuisine.
```

**Validation** is handled by `workflowValidator` in `src/lib/ai-config-validators/workflow.ts`:

| Rule | Detail |
|------|--------|
| `title` | Non-empty string |
| `fields` | Non-empty array with unique `name` values |
| Placeholder match | Every field `name` must appear as `{{name}}` in the body |
| `select` fields | Must have non-empty `options` array |
| `model` | Must be a valid model ID if present |
| `effort` | Must be `low`, `medium`, or `high` if present |
| `maxTokens` | Must be a positive integer if present |
| Body | Non-empty |

## 2. File Watching & Discovery

`initWorkflowWatcher()` in `src/lib/workflow-watcher.ts` runs eagerly on module load.

### Startup sequence

1. Resolve the workflows directory from `OBSIDIAN_DIR` + `OBSIDIAN_AI_CONFIG` + `/workflows/`
2. Find the admin user (first admin in DB, or exit silently)
3. Read all `.md` files in the directory
4. Parse each file with `parseWorkflowFile()` using `gray-matter` + the workflow validator
5. Upsert `Workflow` DB rows via `upsertWorkflowRow()` — creates or updates based on `filename`
6. Mark any DB rows whose files no longer exist with `fileExists: false`
7. Start a **chokidar** file watcher on the directory

### File watcher events

| Event | Handler | Action |
|-------|---------|--------|
| `add` | `handleFileAddOrChange()` | Parse file, validate, upsert DB row |
| `change` | `handleFileAddOrChange()` | Same — re-parse and update |
| `unlink` | `handleFileDelete()` | Set `fileExists: false` in DB (keeps history) |

### In-memory cache

Parsed configs are cached in memory and accessible via:
- `getWorkflowConfig(filename)` — single workflow config
- `getWorkflowConfigs()` — all cached configs

### Process cleanup

Shutdown handlers are registered for `SIGTERM` and `SIGINT` to close the watcher. Vite HMR cleanup is also handled to prevent duplicate watchers during development.

## 3. Shared System Prompt

The file `workflow-prompt.md` in the AI config directory provides a shared system prompt for all workflow executions. It follows the same frontmatter format:

```yaml
---
model: claude-haiku-4-5   # optional — default model for all workflows
effort: low                # optional — default effort for all workflows
---

System prompt body with {{userName}} and {{date}} placeholders.
```

`readWorkflowPromptConfig(userName)` in `src/lib/ai-config.ts` loads and processes this file. If the file is missing or invalid, a **fallback default prompt** is used (defined inline in the function).

## 4. Triggering a Workflow Run

Workflows are triggered manually by the user via the UI form.

### Server function flow

`runWorkflow(filename, formValues)` in `src/lib/workflow.functions.ts`:

1. Validates the session via `ensureSession()`
2. Retrieves the workflow config from the in-memory cache via `getWorkflowConfig(filename)`
3. Validates that all required fields have values
4. Calls `executeWorkflow()` **asynchronously** (fire-and-forget — the server function returns immediately)
5. Returns `{ success: true }` to the UI

The form UI in `WorkflowForm.tsx` renders fields dynamically based on the `WorkflowField[]` definitions:

| Field type | UI component |
|------------|-------------|
| `text` | `<Input>` |
| `textarea` | `<Textarea>` |
| `url` | `<Input type="url">` |
| `select` | `<Select>` with `<SelectItem>` options |

Default values from field definitions are pre-populated. The form is disabled when `fileExists: false`.

## 5. Execution

`executeWorkflow(filename, config, formValues, userId)` in `src/lib/workflow-executor.ts` handles the core AI execution.

### Model and effort resolution

Settings are resolved with a priority chain:

1. **Workflow frontmatter** (highest priority)
2. **`workflow-prompt.md` frontmatter** (defaults)
3. **System defaults** — `claude-haiku-4-5` for model, `low` for effort

This is handled by `resolveModel()` and `resolveEffort()` helper functions.

### Execution steps

1. Fetch the admin user from the DB
2. Resolve model and effort
3. Create a `ChatThread` with `type: "workflow"` and `sourceWorkflowFile: filename`
4. **Substitute placeholders** in the workflow body:
   - `{{date}}` → current ISO date
   - `{{userName}}` → user's display name
   - `{{aiMemoryPath}}` → Obsidian AI memory folder path
   - `{{fieldName}}` → corresponding form value (empty optional fields become `"not entered"`)
5. Load the shared system prompt via `readWorkflowPromptConfig()`
6. Create AI tools via `createAiTools()` (full tool access — file reading, web search, etc.)
7. Call the Anthropic API via `generateText()` with:
   - `stopWhen: stepCountIs(10)` — maximum 10 agentic tool-use steps
   - Ephemeral cache control headers
   - `effort` parameter if the model supports it

### Success path

A database transaction writes:

1. **ChatThread** — updated with `messagesJson`, token usage, system prompt, tool names used
2. **ChatUsageEvent** — input/output/cache token counts, cost, model
3. **ActivityLog** — entry with `type: "workflow"` and metadata (workflow title, filename, thread ID)
4. **Workflow** — `lastRunAt` set, `lastRunStatus: "success"`, `lastThreadId` linked
5. **Notification** — sent unless `notification: "silent"` (push to phone if `notification: "push"`)

### Failure path

Same transaction structure, but:

- `ChatThread` gets an error message appended
- `Workflow.lastRunStatus` is set to `"error"`
- Notification is **always sent** with `pushToPhone: true` regardless of the workflow's notification setting

## 6. Data Model

### Workflow table

Key fields in `prisma/schema.prisma`:

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String (CUID) | Primary key |
| `filename` | String (unique) | Reference to the `.md` file |
| `title` | String | From frontmatter |
| `description` | String? | From frontmatter |
| `model` | String | Default: `claude-haiku-4-5` |
| `effort` | String | Default: `low` |
| `maxTokens` | Int? | Output token limit |
| `fieldsJson` | String | JSON-serialized `WorkflowField[]` |
| `lastRunAt` | DateTime? | Most recent execution time |
| `lastRunStatus` | String? | `"success"` or `"error"` |
| `lastThreadId` | String? | Links to the `ChatThread` of the last run |
| `fileExists` | Boolean | `false` when the source file is deleted |
| `userId` | String | Relation to `User` |

Indexed on `[userId, filename]`.

### ChatThread integration

Workflow runs are stored as `ChatThread` records with:
- `type: "workflow"` (distinguishes from `"chat"` and `"task"`)
- `sourceWorkflowFile: filename` — groups runs by workflow

## 7. Run History & Conversion

### Viewing past runs

`getWorkflowDetail(filename)` in `src/lib/workflow.functions.ts` returns the workflow definition plus all associated `ChatThread` records ordered by most recent first.

`WorkflowRunHistory.tsx` renders an expandable table with columns: timestamp, model, token count, cost. Expanding a row shows the full message exchange via the shared `RunMessages` component.

### Converting to chat

`convertWorkflowToChat(threadId)` changes a workflow run's `ChatThread.type` from `"workflow"` to `"chat"`, making it appear in the regular chat interface for continued conversation.

### Deleting runs

`deleteWorkflowRun(threadId)` removes the `ChatThread` record entirely.

## 8. System Cleanup

The hourly `cleanup-stale-records` system task in `src/lib/system-tasks.ts` removes `Workflow` rows where:
- `fileExists: false` (source file was deleted) **AND**
- `lastRunAt: null` (the workflow was never executed)

This preserves history for workflows that were run at least once, even after their files are removed. Results are logged to `ActivityLog` with `type: "system_task"`.

## 9. UI Layer

### Routes

| Route | File | Content |
|-------|------|---------|
| `/workflows` | `src/routes/workflows/index.tsx` | Grid of `WorkflowCard` components, or `WorkflowEmptyState` |
| `/workflows/$filename` | `src/routes/workflows/$.tsx` | `WorkflowForm` + `WorkflowRunHistory` |

Navigation link in the header (`src/components/Header.tsx`).

### WorkflowCard

Displays in the list view: title, description, field count, model badge, last run time with relative formatting, and status badge:
- **Success** — green
- **Error** — red
- **Running** — blue animated

Shows a "file removed" badge when `fileExists: false`.

### WorkflowForm

Dynamically renders form inputs from the workflow's `fields` array. Handles submission by calling `runWorkflow()`, shows a loading spinner during submission, and displays toast notifications for success or error. Disabled when the source file has been deleted.

### WorkflowEmptyState

Guides the user to create workflow files in the AI config `workflows/` directory.

## Configuration Hierarchy

1. **Per-workflow frontmatter** — highest priority (`model`, `effort`, `maxTokens`, `notification`)
2. **`workflow-prompt.md` frontmatter** — shared defaults (`model`, `effort`)
3. **System defaults** — `claude-haiku-4-5`, `low` effort, `notify` notification level
