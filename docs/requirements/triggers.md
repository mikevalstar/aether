---
title: Triggers
status: draft
owner: Mike
last_updated: 2026-03-21
canonical_file: docs/requirements/triggers.md
---

# Triggers

## Purpose

- Problem: No way to run AI prompts in response to events — file changes in the vault, plugin-detected events (new email, webhook, etc.). Tasks are cron-only; workflows are manual-only. There's a gap for reactive, event-driven AI execution.
- Outcome: Markdown files in the AI config `triggers/` folder define event-driven prompt templates. When a matching event fires (built-in or from a plugin), the trigger loads its prompt, substitutes event details, and executes via the shared `generateText()` agent loop. Results are stored as `ChatThread` records and viewable in the UI.
- Notes: Follows the same config-as-markdown pattern as tasks and workflows. Key difference: event-driven (not scheduled or form-triggered). Concurrent execution allowed. Plugins can both declare and fire trigger events.

## Current Reality

- Current behavior: No trigger infrastructure exists. The task scheduler and workflow executor provide the execution pipeline, DB patterns, and UI patterns to build on. The plugin system provides the extension point for plugins to declare and fire events.
- Constraints: Same as tasks/workflows — SQLite, single-process Node, shared AI harness. Chokidar already used for file watching (vault index, tasks, workflows).
- Non-goals: Not a general event bus or pub/sub system. Not for high-frequency events (debouncing required). Not for user-interactive execution (background only, like workflows).

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Trigger file format | todo | Markdown files in `triggers/` with `title`, `source`, `model`, `effort`, `enabled`, optional `filter`, `maxTokens` in frontmatter, plus source-specific custom fields; body is prompt template with `{{details}}` placeholder |
| Trigger system prompt | todo | `trigger-prompt.md` AI config file — shared system prompt for all trigger executions |
| Zod validator | todo | Base validators for trigger files and trigger-prompt; delegates to source-specific validators for custom frontmatter fields |
| Trigger watcher | todo | Chokidar watcher on `triggers/` config folder for dynamic add/remove/update, syncs to `Trigger` DB table |
| Trigger executor | todo | Execute trigger prompt via shared AI harness with full tool access, agent loop, background (non-streaming) |
| Event dispatcher | todo | Match fired events to trigger configs by `source`, substitute `{{details}}`, execute each match |
| Built-in: file_change | todo | Watch Obsidian vault for file create/modify events, fire triggers with matching `source: file_change` |
| Plugin integration | todo | Extend `AetherPluginServer` with `triggerTypes` and `PluginContext` with `fireTrigger()` |
| Database — Trigger table | todo | `Trigger` table tracking each trigger file's metadata and last fired info |
| Database — ChatThread type | todo | Store trigger runs in `ChatThread` with `type: "trigger"`, `sourceTriggerFile` |
| Usage tracking | todo | Track token usage per trigger run via `ChatUsageEvent` with `taskType: "trigger"` |
| Activity logging | todo | Log trigger executions as `ActivityLog` entries with `type: "trigger"` |
| UI — Trigger list | todo | Page at `/triggers` showing all trigger configs with source, enabled/disabled, last fired time |
| UI — Run history | todo | View past runs for a trigger (same pattern as tasks/workflows) |
| UI — Unconfigured triggers | todo | Section showing plugin trigger types that have no matching trigger config template |
| Nav integration | todo | Add Triggers to header nav and command palette `PAGES` array |
| Seed/pull CLI | todo | Extend `ai-config:seed` and `ai-config:pull` to include example trigger files and trigger-prompt |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Trigger file format & validation | todo | Frontmatter schema + zod validator for `triggers/*.md` | [Detail](#trigger-file-format--validation) |
| Trigger system prompt config | todo | `trigger-prompt.md` AI config file for trigger system prompt | [Detail](#trigger-system-prompt-config) |
| Trigger watcher | todo | Singleton with chokidar watcher, DB sync, in-memory config map | [Detail](#trigger-watcher) |
| Event dispatcher | todo | Match events to trigger configs by source, substitute details, execute | [Detail](#event-dispatcher) |
| Trigger executor | todo | Event → prompt assembly → background agent loop → store result | [Detail](#trigger-executor) |
| Built-in: file_change source | todo | Vault file watcher with glob filter and debounce | [Detail](#built-in-file_change-source) |
| Plugin trigger types | todo | Extend plugin interface with `triggerTypes` declaration, `fireTrigger()` context method, custom frontmatter fields + validation | [Detail](#plugin-trigger-types) |
| Schema migration | todo | New `Trigger` table, extend `ChatThread.type` to include `"trigger"` | [Detail](#schema-migration) |
| Trigger management UI | todo | List view + run history + unconfigured triggers at `/triggers` | [Detail](#trigger-management-ui) |
| CLI tooling | todo | Seed examples, pull config | Inline |

## Detail

### Trigger file format & validation

**File location:** `{obsidianConfigPath}/triggers/*.md`

**Frontmatter schema:**

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `title` | string | yes | — | Human-readable trigger name |
| `source` | string | yes | — | Event source identifier: `file_change` (built-in) or `{pluginId}:{triggerType}` (plugin) |
| `model` | string | no | `claude-haiku-4-5` | Model ID override |
| `effort` | string | no | `low` | Effort level override |
| `enabled` | boolean | no | `true` | Set `false` to pause without deleting the file |
| `maxTokens` | number | no | — | Per-run output token ceiling |
| `filter` | string | no | — | Source-specific filter (e.g., glob pattern for `file_change`: `daily-notes/*.md`) |
| *(custom)* | varies | no | — | Additional source-specific fields declared by the trigger source (built-in or plugin). Passed through to the source's validator. |

**Body:** The markdown body is the prompt sent to Claude. Supports `{{details}}` as the single template placeholder — the trigger source serializes its event payload into this string. Also supports standard placeholders (`{{date}}`, `{{userName}}`, `{{aiMemoryPath}}`).

**Custom frontmatter fields:** Each trigger source (built-in or plugin) can declare additional frontmatter fields beyond the base schema. These fields are:
- Declared via `frontmatterFields` on `PluginTriggerType` (or on the built-in source definition) — reuses the `PluginOptionField` type for consistency
- Validated by a source-specific validator function (`validateFrontmatter`) provided by the trigger source
- Stored as-is in the parsed trigger config and accessible to the source when filtering/matching events
- Displayed in the Obsidian editor with validation feedback (same pattern as plugin option fields)

**Example:** An IMAP plugin trigger type `new_email` might declare fields `folder` (select: INBOX/Sent/etc.) and `from_filter` (text: glob pattern for sender). The trigger config file would have:
```yaml
title: Summarize new client emails
source: imap_email:new_email
folder: INBOX
from_filter: "*@clientcorp.com"
enabled: true
```

**Validator:** New file `src/lib/ai-config-validators/trigger.ts`. Two-phase validation:

1. **Base validation** (always runs):
   - `title` is non-empty
   - `source` is non-empty string
   - `model` (if present) is a known model ID from `chat-models.ts`
   - `effort` (if present) is valid for the chosen model
   - `enabled` (if present) is boolean
   - `maxTokens` (if present) is a positive integer
   - `filter` (if present) is a non-empty string
   - Body is non-empty and contains `{{details}}`

2. **Source-specific validation** (if source has a validator):
   - Look up the trigger source (built-in or from enabled plugins)
   - If the source declares a `validateFrontmatter` function, call it with the extra frontmatter fields
   - Validation errors from the source validator are merged into the base validation result
   - If the source is not found (plugin not enabled, unknown source), emit a warning but don't fail — the trigger just won't fire until a matching source exists

**Example file:** `examples/ai-config/triggers/vault-file-changed.md`

### Trigger system prompt config

**File:** `{obsidianConfigPath}/trigger-prompt.md`

**Purpose:** System prompt for all trigger executions. Separate from task/workflow/chat system prompts because triggers have unique context — they're reacting to an external event, the details of which are injected into the user prompt.

**Frontmatter schema:**

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `model` | string | no | — | Default model for triggers (overridden by per-trigger `model`) |
| `effort` | string | no | — | Default effort for triggers (overridden by per-trigger `effort`) |

**Body:** System prompt template with `{{placeholder}}` substitution (`{{date}}`, `{{userName}}`, etc.). Should instruct the AI that it's responding to an event trigger, not in a conversation.

**Fallback:** Hardcoded default if `trigger-prompt.md` doesn't exist (same pattern as task-prompt/workflow-prompt).

**Example file:** `examples/ai-config/trigger-prompt.md`

### Trigger watcher

**Module:** `src/lib/trigger-watcher.ts`

**Architecture:** Singleton following the same pattern as `task-scheduler.ts` and `workflow-watcher.ts` — chokidar file watching, DB sync, HMR cleanup.

**Lifecycle:**
1. Read all `triggers/*.md` files from AI config path, parse and validate
2. Upsert `Trigger` rows in DB with current frontmatter values; mark missing files as `fileExists: false`
3. Store valid configs in `Map<filename, TriggerConfig>`
4. Start chokidar watcher on `{obsidianConfigPath}/triggers/`
5. On file add: parse, validate, upsert row, add to Map, register with dispatcher
6. On file change: re-parse, validate, upsert row, update Map entry
7. On file delete: remove from Map, set `fileExists: false` in DB
8. On shutdown/HMR: close watcher, cleanup

**Exposed API:**
- `initTriggerWatcher(): Promise<void>` — idempotent
- `getTriggerConfigs(): Map<string, TriggerConfig>` — for UI and dispatcher
- `getTriggerConfig(filename: string): TriggerConfig | undefined`
- `closeTriggerWatcher(): Promise<void>` — cleanup

### Event dispatcher

**Module:** Part of `src/lib/trigger-watcher.ts` or a separate `src/lib/trigger-dispatcher.ts`

**Core function:** `fireTrigger(source: string, details: string): void`

**Flow:**
1. Receive event with `source` string and `details` string
2. Iterate all trigger configs from the watcher's in-memory Map
3. Filter to configs where `config.source === source` and `config.enabled === true`
4. For `file_change` triggers, also check `config.filter` against the file path (glob match via micromatch or picomatch)
5. For each matching trigger: spawn `executeTrigger(config, details)` concurrently (fire-and-forget, no await)
6. Multiple triggers can match the same event — all execute independently

**Debounce:** The dispatcher itself does not debounce — that's the responsibility of each trigger source (e.g., file_change source debounces before calling `fireTrigger()`).

### Trigger executor

**Module:** `src/lib/trigger-executor.ts`

**Flow (same pattern as task/workflow executor):**
1. Create `ChatThread` with `type: "trigger"`, `sourceTriggerFile: filename`, title from config, model from config
2. Load trigger system prompt from `trigger-prompt.md`, substitute standard placeholders
3. Substitute `{{details}}` in trigger body with the event details string, plus standard placeholders
4. Execute agent loop via `generateText()` with full tool access (`createAiTools()`)
5. On completion: serialize messages to `messagesJson`, update usage fields on thread
6. Create `ChatUsageEvent` with `taskType: "trigger"`
7. Create `ActivityLog` with `type: "trigger"` and metadata `{ triggerFile, source, chatThreadId, model, inputTokens, outputTokens, estimatedCostUsd, success }`
8. Update `Trigger` row: `lastFiredAt`, `lastRunStatus`, `lastThreadId`
9. On error: store error in thread, log activity with `success: false`, update `Trigger` row with `lastRunStatus: "error"`

**Concurrency:** No protection/dedup — concurrent execution allowed. Multiple events can trigger the same config simultaneously.

**User context:** Same as tasks — runs as the first admin user.

### Built-in: file_change source

**Source identifier:** `file_change`

**Watches:** Obsidian vault directory (reuses or extends existing vault chokidar watcher)

**Events:** File create and modify (not delete — deletes don't need AI processing)

**Filter:** The trigger config's `filter` field is a glob pattern matched against the file's path relative to the vault root. Examples:
- `*.md` — any markdown file in vault root
- `daily-notes/*.md` — only daily notes
- `Projects/**/*.md` — anything under Projects
- No filter = all files

**Debounce:** 2-second debounce per file path to avoid firing on rapid successive saves (e.g., auto-save). Uses a simple `Map<filePath, setTimeout>` — each new event for the same path resets the timer.

**Details payload:** Serialized string containing:
- File path (relative to vault root)
- Change type: `created` or `modified`
- File content (full text of the file after the change)

**Example details string:**
```
File: daily-notes/2026-03-21.md
Change: modified
Content:
---
date: 2026-03-21
---
# Friday March 21

- Met with design team about dashboard redesign
- Fixed scrolling bug in requirements nav
```

**Self-trigger prevention:** Ignore file changes that originate from AI tool writes (obsidian_write, obsidian_edit) to prevent infinite loops. Track "AI-written paths" with a short-lived set (clear after debounce window).

### Plugin trigger types

**New types:**

```typescript
type PluginTriggerType = {
  type: string;        // e.g., "new_email" — will be prefixed as {pluginId}:{type}
  label: string;       // display label, e.g., "New Email Received"
  description: string; // what this trigger fires on, shown in unconfigured triggers UI

  /** Markdown instructions explaining what details this trigger provides, how to write
   *  effective prompts for it, what the {{details}} payload looks like, etc.
   *  Displayed in the UI when creating/editing a trigger config for this type. */
  instructions?: string;

  /** Custom frontmatter fields for this trigger type — reuses PluginOptionField for consistency */
  frontmatterFields?: PluginOptionField[];

  /** Validate custom frontmatter values; returns array of error strings (empty = valid) */
  validateFrontmatter?: (fields: Record<string, unknown>) => string[];
};
```

**Built-in source definition** (for `file_change`):

```typescript
type BuiltInTriggerSource = {
  source: string;      // "file_change"
  label: string;
  description: string;
  instructions?: string;  // markdown guide for writing prompts targeting this source
  frontmatterFields?: PluginOptionField[];
  validateFrontmatter?: (fields: Record<string, unknown>) => string[];
};
```

The built-in `file_change` source declares `filter` as a text field with description "Glob pattern for vault file paths". Plugin trigger types follow the same shape via `PluginTriggerType`.

**Extension to `AetherPluginServer`:**

```typescript
type AetherPluginServer = {
  // ... existing fields ...
  /** Trigger event types this plugin can fire */
  triggerTypes?: PluginTriggerType[];
};
```

**Extension to `PluginContext`:**

```typescript
type PluginContext = {
  // ... existing fields ...
  /** Fire a trigger event — dispatches to all matching trigger configs */
  fireTrigger: (type: string, details: string) => void;
};
```

**How it works:**
1. Plugin declares `triggerTypes` in its server definition (e.g., IMAP plugin declares `{ type: "new_email", label: "New Email Received", description: "Fires when a new unread email is detected" }`)
2. Plugin calls `ctx.fireTrigger("new_email", "From: alice@example.com\nSubject: Meeting notes\n...")` when the event occurs
3. The context implementation calls the dispatcher with source `{pluginId}:{type}` (e.g., `imap_email:new_email`)
4. Dispatcher matches against trigger configs with `source: imap_email:new_email`

**When plugins fire triggers:** Up to each plugin. The IMAP plugin might fire on health check if new unread mail is detected. A future webhook plugin might fire on incoming HTTP POST. The trigger system doesn't prescribe when — it only provides the `fireTrigger()` mechanism.

### Schema migration

**New `Trigger` model:**

```prisma
model Trigger {
  id             String    @id @default(cuid())
  filename       String    @unique          // e.g. "vault-file-changed.md"
  title          String                     // from frontmatter at last sync
  source         String                     // e.g. "file_change", "imap_email:new_email"
  filter         String?                    // source-specific filter (glob, etc.)
  model          String    @default("claude-haiku-4-5")
  effort         String    @default("low")
  enabled        Boolean   @default(true)
  maxTokens      Int?
  lastFiredAt    DateTime?                  // when the last execution started
  lastRunStatus  String?                    // "success" | "error"
  lastThreadId   String?                    // FK to the ChatThread of the last run
  fileExists     Boolean   @default(true)   // false when file deleted but record kept
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  userId         String
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, source])
  @@index([userId, filename])
}
```

**`ChatThread` changes:**
- `type` extended with `"trigger"` value (alongside existing `chat`, `task`, `workflow`)
- Add column `sourceTriggerFile String?` — the filename of the trigger config that created this thread

**`ChatUsageEvent` changes:**
- `taskType` extended with `"trigger"` value. No schema change needed (already a string field).

**Query changes:**
- Existing chat/task/workflow queries already filter by type — no changes needed
- New server functions for trigger runs: filter `WHERE type = 'trigger'` with optional `sourceTriggerFile` filter

### Trigger management UI

**Route:** `/triggers`

**List view:**
- Data source: `Trigger` table joined with in-memory config state
- Columns: title, source (with human-readable label), filter (if set), last fired, last status, enabled/disabled
- Row actions: view run history, link to edit file in Obsidian editor (`/o/{configPath}/triggers/{filename}`)
- Visual indicators: disabled triggers (dimmed), deleted files (`fileExists: false` — greyed out)

**Run history view:**
- Clicking a trigger navigates to `/triggers/:filename`
- Past runs are `ChatThread` records where `sourceTriggerFile` matches
- Each run shows: timestamp, source event, model, duration, token usage, estimated cost, status
- Expandable detail: full prompt (with substituted details), full response (rendered markdown including tool calls/results)
- Delete button per run

**Unconfigured triggers section:**
- Displayed below the configured triggers list (or as a separate tab/section)
- Queries all enabled plugins for `triggerTypes`, then checks if any trigger config file has a matching `source: {pluginId}:{type}`
- For each unmatched trigger type, shows:
  - Plugin name + icon
  - Trigger type label and description
  - Rendered `instructions` markdown (if provided) — explains what the trigger does, what the `{{details}}` payload looks like, tips for writing effective prompts
  - "Create Trigger" button — navigates to Obsidian editor to create a new file in `triggers/` with pre-filled frontmatter (`source: {pluginId}:{type}`, `title: {label}`, `enabled: true`, plus any custom `frontmatterFields` with their defaults) and a placeholder body with `{{details}}`
- When all plugin trigger types have matching configs, this section is hidden

## File Structure

```
src/lib/
  trigger-watcher.ts                    # Watcher + config sync + event dispatcher
  trigger-executor.ts                   # generateText() execution harness
  trigger.functions.ts                  # Server functions for UI
  ai-config-validators/trigger.ts       # Zod validators for trigger files
  ai-config-validators/trigger-prompt.ts # Zod validator for trigger-prompt.md
src/routes/
  triggers.tsx                          # /triggers list page
  triggers.$filename.tsx                # /triggers/:filename run history
src/plugins/
  types.ts                              # Extended with PluginTriggerType, fireTrigger on PluginContext
  plugin-context.ts                     # fireTrigger() implementation wired to dispatcher
```

## Open Questions

*No open questions.*

## Resolved Questions

- ~~**file_change scope:** Should the watcher cover the entire vault or only specific top-level folders?~~ Resolved: Watch entire vault, use `filter` glob in trigger config to narrow which files actually fire. Simpler architecture, filter handles specificity.

## Implementation Plan

| Step | Status | Plan |
| --- | --- | --- |
| 1. Schema migration | todo | New `Trigger` model, add `sourceTriggerFile` to `ChatThread`, extend `type` enum |
| 2. Trigger file format + validator | todo | Zod schema, validator registration, example files |
| 3. Trigger system prompt | todo | `trigger-prompt.md` config file, validator, example, config reader with fallback |
| 4. Trigger watcher | todo | Singleton with chokidar on `triggers/`, DB sync, in-memory config Map |
| 5. Event dispatcher | todo | `fireTrigger(source, details)` function matching events to configs |
| 6. Trigger executor | todo | Wire dispatcher to shared AI harness, store results, track usage, log activity |
| 7. Plugin integration | todo | Add `triggerTypes` to `AetherPluginServer`, `fireTrigger()` to `PluginContext`, wire to dispatcher |
| 8. Built-in: file_change | todo | Vault file watcher with debounce, glob filter, self-trigger prevention |
| 9. UI — Trigger list + history | todo | Routes, server functions, list + run history components |
| 10. UI — Unconfigured triggers | todo | Query plugin trigger types, diff against configs, render missing section |
| 11. Nav integration | todo | Add to header nav and command palette `PAGES` array |
| 12. CLI updates | todo | Seed/pull for triggers folder + trigger-prompt |

## Change Log

- 2026-03-21: Initial requirements drafted. Built-in source: file_change. Plugin integration via triggerTypes + fireTrigger(). Single `{{details}}` placeholder for event payloads. Unconfigured triggers UI for missing templates.
- 2026-03-21: Resolved file_change scope (glob filter). Added custom frontmatter fields: trigger sources (built-in + plugin) can declare `frontmatterFields` (reuses `PluginOptionField`) and `validateFrontmatter` for source-specific config. Two-phase validation in the zod validator. Added `instructions` markdown field to trigger types for authoring guidance. Marked as draft — feature needs more design thought.
