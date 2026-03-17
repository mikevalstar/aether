---
title: Workflows
status: todo
owner: Mike
last_updated: 2026-03-16
canonical_file: docs/requirements/workflows.md
---

# Workflows

## Purpose

- Problem: Repetitive AI-driven tasks (e.g., converting a URL to a recipe, generating files from templates) require typing the same prompt structure every time in chat. No way to define reusable prompt templates with structured user input.
- Outcome: Markdown files in the AI config `workflows/` folder define form-based prompt templates. The user fills out a form in the UI, submits it, and the workflow runs in the background with full tool access. Past runs are viewable and can be converted to chat threads for follow-up.
- Notes: Follows the same config-as-markdown pattern as tasks. Key difference: user-triggered via form submission (not cron-scheduled). Runs in background (not streamed). Output is primarily side effects (file creation, tool use) rather than conversational responses.

## Current Reality

- Current behavior: No workflow infrastructure exists. The `workflows/` subfolder is already reserved in `AI_MEMORY_SUBFOLDERS` in `obsidian-ai-notes.ts`. The periodic tasks feature provides the execution pipeline, DB patterns, and UI patterns to build on.
- Constraints: Same as tasks — SQLite, single-process Node, shared AI harness. Background execution reuses `generateText()` agent loop from task executor.
- Non-goals: Not a visual workflow builder or DAG system. Not for scheduled/recurring execution (that's tasks). Not for interactive chat-style back-and-forth during execution.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Workflow file format | todo | Markdown files in `workflows/` with `title`, `fields` array, `model`, `effort` in frontmatter; body is the prompt template with `{{fieldName}}` placeholders |
| Workflow system prompt | todo | `workflow-prompt.md` AI config file — shared system prompt for all workflow executions |
| Zod validator | todo | Validators for workflow files and workflow-prompt following existing `ai-config-validators` pattern |
| Workflow execution | todo | Execute workflow via shared AI harness with full tool access, agent loop, background (non-streaming) |
| Database — Workflow table | todo | `Workflow` table tracking each workflow file's metadata and last run info |
| Database — ChatThread type | todo | Store workflow runs in `ChatThread` with `type: "workflow"`, `sourceWorkflowFile` |
| Convert to chat | todo | Button on a completed workflow run to convert it into a regular chat thread for follow-up conversation |
| Usage tracking | todo | Track token usage per workflow run via `ChatUsageEvent` with `taskType: "workflow"` |
| Activity logging | todo | Log workflow executions as `ActivityLog` entries with `type: "workflow"` |
| UI — Workflow list | todo | Page at `/workflows` showing available workflows and recent runs across all workflows |
| UI — Workflow detail | todo | Page at `/workflows/:filename` showing the form to run + past runs for that specific workflow |
| Seed/pull CLI | todo | Extend `ai-config:seed` and `ai-config:pull` to include example workflow files and workflow-prompt |
| File watching | todo | Chokidar watcher on `workflows/` for dynamic add/remove/update (same pattern as tasks) |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Workflow file format & validation | todo | Frontmatter schema with form field definitions + zod validator | Inline |
| Workflow system prompt config | todo | `workflow-prompt.md` AI config file for workflow system prompt | Inline |
| Workflow execution pipeline | todo | Form input → prompt assembly → background agent loop → store result | Inline |
| Convert to chat | todo | Promote a workflow run's ChatThread to a regular chat for follow-up | Inline |
| Schema migration | todo | New `Workflow` table, extend `ChatThread.type` to include `"workflow"` | Inline |
| Workflow management UI | todo | List view + form + run history at `/workflows` | Inline |
| CLI tooling | todo | Seed examples, pull config | Inline |

## Detail

### Workflow file format & validation

**File location:** `{obsidianConfigPath}/workflows/*.md`

**Frontmatter schema:**

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `title` | string | yes | — | Human-readable workflow name |
| `description` | string | no | — | Short description shown in the workflow list and above the form |
| `model` | string | no | `claude-haiku-4-5` | Model ID override |
| `effort` | string | no | `low` | Effort level override |
| `maxTokens` | number | no | — | Per-run output token ceiling |
| `fields` | array | yes | — | Form field definitions (see below) |

**Field definition schema:**

Each entry in the `fields` array:

| Property | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `name` | string | yes | — | Unique field identifier, used as `{{name}}` placeholder in the prompt template |
| `label` | string | yes | — | Human-readable label shown in the form |
| `type` | string | no | `text` | Field type: `text`, `textarea`, `url`, `select` |
| `required` | boolean | no | `true` | Whether the field must be filled |
| `placeholder` | string | no | — | Placeholder text for the input |
| `options` | string[] | no | — | Options for `select` type fields |
| `default` | string | no | — | Default value |

**Body:** The markdown body is the prompt template. Uses `{{fieldName}}` placeholders matching field `name` values — simple find-and-replace, no conditional blocks. Empty optional fields are substituted with `"not entered"`. Also supports standard placeholders (`{{date}}`, `{{userName}}`, `{{aiMemoryPath}}`).

**Validator:** New file `src/lib/ai-config-validators/workflow.ts`. Validates:
- `title` is non-empty
- `fields` is a non-empty array with valid entries
- Each field has a unique `name`
- Each field `name` appears as a `{{name}}` placeholder in the body
- `model` (if present) is a known model ID
- `effort` (if present) is valid for the chosen model
- `maxTokens` (if present) is a positive integer
- `select` type fields have non-empty `options` array
- Body is non-empty

**Example file:** `examples/ai-config/workflows/url-to-recipe.md`

```markdown
---
title: URL to Recipe
description: Convert a recipe URL into a formatted recipe file in the recipes folder
model: claude-haiku-4-5
effort: low
fields:
  - name: url
    label: Recipe URL
    type: url
    required: true
    placeholder: "https://example.com/recipe/..."
  - name: instructions
    label: Additional Instructions
    type: textarea
    required: false
    placeholder: "Any modifications or notes..."
---

Fetch the recipe at the following URL and convert it to a recipe markdown file
in the recipes folder, following the recipe template.

URL: {{url}}

Additional instructions from the user:
{{instructions}}
```

### Workflow system prompt config

**File:** `{obsidianConfigPath}/workflow-prompt.md`

**Purpose:** Shared system prompt for all workflow executions. Instructs the AI that it's running a background workflow, should use tools to produce output (file creation, etc.), and should be concise in its text responses since the user isn't watching live.

**Frontmatter schema:**

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `model` | string | no | — | Default model for workflows (overridden by per-workflow `model`) |
| `effort` | string | no | — | Default effort for workflows (overridden by per-workflow `effort`) |

**Body:** System prompt template with `{{placeholder}}` substitution.

**Validator:** `src/lib/ai-config-validators/workflow-prompt.ts`. Validates body is non-empty, model/effort valid if present.

**Fallback:** Hardcoded default if file doesn't exist (same pattern as task-prompt).

### Workflow execution pipeline

**Trigger:** User submits the form in the UI. Server function receives the workflow filename + form field values.

**Flow:**
1. Load workflow file, validate form values against field definitions
2. Substitute `{{fieldName}}` placeholders in the prompt body with form values. Empty optional fields are replaced with `"not entered"`.
3. Create a new `ChatThread` with `type: "workflow"`, `sourceWorkflowFile: filename`, title from workflow config
4. Load workflow system prompt from `workflow-prompt.md`, substitute standard placeholders
5. Enter agent loop via shared harness (`generateText()` with `stopWhen: stepCountIs(10)`, full tool access)
6. On completion: serialize messages into `messagesJson`, update usage fields
7. Create `ChatUsageEvent` with `taskType: "workflow"`
8. Create `ActivityLog` entry with `type: "workflow"` and metadata `{ workflowFile, chatThreadId, model, inputTokens, outputTokens, estimatedCostUsd, success, formValues }`
9. Upsert `Workflow` row: set `lastRunAt`, `lastRunStatus`, `lastThreadId`
10. On error: store error in thread, log with `success: false`

**Concurrency:** Multiple workflow runs can execute simultaneously (unlike tasks which use `protect: true`). Each run creates its own ChatThread.

### Convert to chat

A completed workflow run is stored as a `ChatThread` with `type: "workflow"`. To allow the user to continue the conversation:

- **UI:** "Continue in Chat" button on a workflow run result
- **Action:** Server function that updates the ChatThread: sets `type` to `"chat"`, clears `sourceWorkflowFile`
- **Result:** The thread now appears in the regular chat sidebar and can be continued with normal chat interaction
- **Irreversible:** Once converted, it's a regular chat thread. The workflow run history still shows it (via ActivityLog) but marked as "converted to chat" with a link

### Schema migration

**New `Workflow` model:**

```prisma
model Workflow {
  id             String    @id @default(cuid())
  filename       String    @unique          // e.g. "url-to-recipe.md"
  title          String                     // from frontmatter
  description    String?                    // from frontmatter
  model          String    @default("claude-haiku-4-5")
  effort         String    @default("low")
  maxTokens      Int?
  fieldsJson     String                     // JSON serialized fields array
  lastRunAt      DateTime?
  lastRunStatus  String?                    // "success" | "error" | "running"
  lastThreadId   String?
  fileExists     Boolean   @default(true)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  userId         String
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, filename])
}
```

**ChatThread changes:**
- Extend `type` to accept `"workflow"` (in addition to `"chat"` and `"task"`)
- Add `sourceWorkflowFile String?` column for grouping runs by workflow

**Query changes:**
- Existing chat queries already filter `WHERE type = 'chat'` (from tasks migration)
- New server functions for workflow runs: filter `WHERE type = 'workflow'` with optional `sourceWorkflowFile` filter

### Workflow management UI

**Route: `/workflows`**

**List view:**
- Data source: `Workflow` table, joined with recent ChatThread runs
- Each workflow shown as a card or row: title, description, field count, last run time/status
- Click to navigate to `/workflows/:filename`
- Visual indicators: deleted files (`fileExists: false` — greyed out)

**Route: `/workflows/:filename`**

**Form + history view:**
- Top section: workflow title, description, dynamically rendered form from field definitions
- Form renders appropriate input components per field type (`text` → Input, `textarea` → Textarea, `url` → Input with URL validation, `select` → Select)
- Submit button triggers background execution, shows toast/notification
- Bottom section: past runs table — timestamp, status, model, token usage, cost
- Expandable run detail: full rendered response (markdown with tool calls/results)
- "Continue in Chat" button on completed runs
- Delete button per run

**Form field rendering:**

| Field type | Component | Validation |
| --- | --- | --- |
| `text` | `<Input>` | Required check |
| `textarea` | `<Textarea>` | Required check |
| `url` | `<Input type="url">` | Required + URL format |
| `select` | `<Select>` with options | Required + valid option |

### CLI tooling

- `pnpm ai-config:seed` — include `workflows/` folder with example file(s) and `workflow-prompt.md`
- `pnpm ai-config:pull` — include `workflows/` and `workflow-prompt.md` in pull

### File watching

Chokidar watcher on `{obsidianConfigPath}/workflows/` directory (same pattern as tasks):
- On file add: parse, validate, upsert `Workflow` row with `fileExists: true`
- On file change: re-parse, validate, upsert `Workflow` row
- On file delete: set `Workflow.fileExists = false` (keep row for run history)
- Watcher can be integrated into the existing task scheduler module or run as a separate singleton

## Open Questions

None — all questions resolved.

## Implementation Plan

Suggested build order:

1. **Schema migration** — New `Workflow` model, add `"workflow"` to `ChatThread.type`, add `sourceWorkflowFile` column
2. **Workflow file format + validator** — Zod schema for workflow frontmatter (including fields array), validator registration, example files
3. **Workflow system prompt** — `workflow-prompt.md` config file, validator, example, config reader with fallback
4. **File watcher + DB sync** — Chokidar watcher on `workflows/`, upsert `Workflow` rows on add/change/delete
5. **Workflow execution pipeline** — Form value substitution, prompt assembly, background agent loop via shared harness, result storage
6. **UI — Workflow list** — `/workflows` route, server functions, list component
7. **UI — Workflow form + history** — `/workflows/:filename` route, dynamic form rendering, run history, run detail view
8. **Convert to chat** — Server function + UI button to promote a workflow run to a regular chat thread
9. **CLI updates** — Seed/pull for workflows folder + workflow-prompt
10. **Polish** — Cost guards, error display, toast notifications on completion

## Change Log

- 2026-03-16: Initial requirements draft
- 2026-03-16: Resolved open questions — no conditional template syntax (empty fields → "not entered"), toast notifications for now, thread title is just the workflow title
