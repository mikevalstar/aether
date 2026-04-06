---
title: Triggers
status: draft
owner: Mike
last_updated: 2026-04-06
canonical_file: docs/requirements/triggers.md
---

# Triggers

## Purpose

- Problem: No way to run AI prompts in response to external events — webhooks, plugin-detected events (new email, etc.). Tasks are cron-only; workflows are manual form-based. There's a gap for reactive, event-driven AI execution.
- Outcome: Markdown files in the AI config `triggers/` folder define event-driven prompt templates. When a matching event fires (via webhook or plugin), the trigger loads its prompt, substitutes event details via `{{details}}`, and executes via the shared `executePrompt()` agent loop. Results are stored as `ChatThread` records with `type: "trigger"` and viewable in the UI. Webhooks are managed via a dedicated UI page where users generate API keys and URLs.
- Notes: Follows the same config-as-markdown pattern as tasks and workflows. Key differences: event-driven (not scheduled or form-triggered), incoming events are JSON, pattern matching via JMESPath expressions. Plugins can declare trigger types they fire and use `fireTrigger()` on their context.

## Current Reality

- Current behavior: No trigger infrastructure exists. The task scheduler and workflow executor provide the execution pipeline, DB patterns, and UI patterns to build on. The plugin system provides the extension point for plugins to declare and fire events.
- Constraints: Same as tasks/workflows — SQLite, single-process Node, shared AI harness. `executePrompt()` in `executor-shared.ts` handles thread creation, usage tracking, activity logging, and notifications — triggers will extend its `type` union.
- Non-goals: Not a general event bus or pub/sub system. No Obsidian file change trigger (may revisit later). No HMAC signature verification for webhooks (may explore later). No rate limiting on webhook endpoints (may revisit).

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Trigger file format | done | Markdown files in `triggers/` with `title`, `type`, `model`, `effort`, `enabled`, optional `pattern`, `maxTokens`, notification fields in frontmatter; body is prompt template with `{{details}}` placeholder |
| Trigger system prompt | todo | `trigger-prompt.md` AI config file — shared system prompt for all trigger executions |
| Zod validator | done | Validators for trigger files and trigger-prompt; validates base fields + type existence |
| Trigger watcher | todo | Chokidar watcher on `triggers/` config folder for dynamic add/remove/update, syncs to `Trigger` DB table |
| Trigger executor | todo | Execute trigger prompt via shared `executePrompt()` harness with full tool access, agent loop, background (non-streaming) |
| Event dispatcher | todo | Match fired events to trigger configs by `type`, evaluate JMESPath `pattern` against JSON payload, execute each match |
| Webhook system | todo | `Webhook` DB table for API key management; API endpoint at `/api/triggers/webhook/{apiKey}` accepting JSON POST; webhook management UI at `/triggers/webhooks` |
| Plugin integration | todo | Extend `AetherPlugin` with `triggerTypes` array; extend `PluginContext` with `fireTrigger()` method |
| Database — Trigger table | done | `Trigger` table tracking each trigger file's metadata and last fired info |
| Database — Webhook table | todo | `Webhook` table for API keys with name, type, key, timestamps |
| Database — ChatThread type | done | Store trigger runs in `ChatThread` with `type: "trigger"`, `sourceTriggerFile` |
| Usage tracking | todo | Track token usage per trigger run via `ChatUsageEvent` with `taskType: "trigger"` |
| Activity logging | todo | Log trigger executions as `ActivityLog` entries with `type: "trigger"` |
| UI — Trigger list | done | Page at `/triggers` showing all trigger configs with type, enabled/disabled, last fired time |
| UI — Trigger editor | done | Config editor at `/triggers/editor` using `ConfigEditorShell` pattern (same as tasks/workflows) |
| UI — Run history | done | View past runs for a trigger at `/triggers/:filename` (same pattern as tasks) |
| UI — Webhook management | todo | Page at `/triggers/webhooks` for creating, viewing, revoking, and regenerating webhook API keys |
| UI — Unconfigured triggers | todo | Section on trigger editor showing plugin trigger types that have no matching trigger config |
| Nav integration | done | Add Triggers to header nav `primaryLinks` and command palette `STATIC_PAGES` array |
| Seed/pull CLI | todo | Extend `ai-config:seed` and `ai-config:pull` to include example trigger files and trigger-prompt |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Trigger file format & validation | done | Frontmatter schema + zod validator for `triggers/*.md` | [Detail](#trigger-file-format--validation) |
| Trigger system prompt config | todo | `trigger-prompt.md` AI config file for trigger system prompt | [Detail](#trigger-system-prompt-config) |
| Trigger watcher | todo | Singleton with chokidar watcher, DB sync, in-memory config map | [Detail](#trigger-watcher) |
| Event dispatcher | todo | Match events to trigger configs by type, JMESPath pattern filter, execute | [Detail](#event-dispatcher) |
| Trigger executor | todo | Event -> prompt assembly -> `executePrompt()` -> store result | [Detail](#trigger-executor) |
| Webhook system | todo | API key management, HTTP endpoint, management UI | [Detail](#webhook-system) |
| Plugin trigger types | todo | Extend plugin interface with `triggerTypes` declaration and `fireTrigger()` context method | [Detail](#plugin-trigger-types) |
| Schema migration | partial | `Trigger` table + `ChatThread.sourceTriggerFile` done; `Webhook` table pending | [Detail](#schema-migration) |
| Trigger management UI | partial | List, history, editor done; webhook management pending | [Detail](#trigger-management-ui) |
| CLI tooling | todo | Seed examples, pull config | Inline |

## Detail

### Trigger file format & validation

**File location:** `{obsidianConfigPath}/triggers/*.md`

**Frontmatter schema:**

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `title` | string | yes | — | Human-readable trigger name |
| `type` | string | yes | — | Event type identifier: a webhook type string (e.g. `github`, `stripe`) or a plugin trigger type `{pluginId}:{triggerType}` (e.g. `imap_email:new_email`) |
| `model` | string | no | `claude-haiku-4-5` | Model ID override (aliases accepted) |
| `effort` | string | no | `low` | Effort level override |
| `enabled` | boolean | no | `true` | Set `false` to pause without deleting the file |
| `maxTokens` | number | no | — | Per-run output token ceiling |
| `pattern` | string | no | — | JMESPath expression evaluated against the incoming JSON payload. Trigger fires if the expression returns a truthy value. Omit to match all events of this type. |
| `notification` | string | no | `notify` | Notification delivery: `silent`, `notify`, or `push` |
| `notificationLevel` | string | no | `info` | Notification severity: `info`, `low`, `medium`, `high`, `critical` |
| `notifyUsers` | array | no | `["all"]` | Email addresses to notify, or `["all"]` |
| `pushMessage` | boolean | no | `false` | Force push notification |

**Body:** The markdown body is the prompt sent to Claude. Supports `{{details}}` as the event payload placeholder — the dispatcher serializes the JSON event payload into this string. Also supports standard placeholders (`{{date}}`, `{{userName}}`, `{{aiMemoryPath}}`).

**Pattern matching:** Uses [JMESPath](https://jmespath.org/) expressions against the raw JSON payload. Examples:
- `contains(repository.full_name, 'my-repo')` — match GitHub events for a specific repo
- `action == 'opened'` — match only "opened" events
- `length(commits) > '0'` — match pushes with commits
- No pattern = match all events of this type

**Validator:** New file `src/lib/ai-config/validators/trigger.ts`. Validation rules:

- `title` is non-empty
- `type` is non-empty string
- `model` (if present) is a known model ID from `chat-models.ts` (aliases accepted)
- `effort` (if present) is valid for the chosen model
- `enabled` (if present) is boolean
- `maxTokens` (if present) is a positive integer
- `pattern` (if present) is a non-empty string (JMESPath syntax validation if feasible)
- Notification fields validated using shared validators from `shared.ts`
- Body is non-empty and contains `{{details}}`

**Example file:** `examples/ai-config/triggers/github-push.md`

```yaml
---
title: Summarize GitHub pushes
type: github
pattern: "ref == 'refs/heads/main'"
model: claude-haiku-4-5
effort: low
enabled: true
---

A GitHub push event just occurred. Please summarize the changes:

{{details}}

Provide a brief summary of what changed and flag anything that looks risky.
```

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

**Architecture:** Singleton following the same pattern as `task-scheduler.ts` and `workflow-watcher.ts` — chokidar file watching, DB sync, HMR cleanup via `globalThis.__aetherTriggerWatcherState`.

**Lifecycle:**
1. Read all `triggers/*.md` files from AI config path, parse and validate
2. Upsert `Trigger` rows in DB with current frontmatter values; mark missing files as `fileExists: false`
3. Store valid configs in `Map<filename, TriggerConfig>`
4. Start chokidar watcher on `{obsidianConfigPath}/triggers/`
5. On file add: parse, validate, upsert row, add to Map
6. On file change: re-parse, validate, upsert row, update Map entry
7. On file delete: remove from Map, set `fileExists: false` in DB
8. On shutdown/HMR: close watcher, cleanup

**Exposed API:**
- `initTriggerWatcher(): Promise<void>` — idempotent
- `getTriggerConfigs(): Map<string, TriggerConfig>` — for UI and dispatcher
- `getTriggerConfig(filename: string): TriggerConfig | undefined`
- `closeTriggerWatcher(): Promise<void>` — cleanup

### Event dispatcher

**Module:** `src/lib/trigger-dispatcher.ts`

**Core function:** `fireTrigger(type: string, payload: Record<string, unknown>): void`

**Flow:**
1. Receive event with `type` string and `payload` object (parsed JSON)
2. Iterate all trigger configs from the watcher's in-memory Map
3. Filter to configs where `config.type === type` and `config.enabled === true`
4. For configs with a `pattern`: evaluate the JMESPath expression against `payload` — skip if result is falsy
5. For each matching trigger: spawn `executeTrigger(config, payload)` concurrently (fire-and-forget, no await)
6. Multiple triggers can match the same event — all execute independently

**JMESPath library:** Use `@metrichor/jmespath` or similar TypeScript-compatible JMESPath implementation.

**Details serialization:** The `payload` object is serialized to a readable string for the `{{details}}` placeholder. Use `JSON.stringify(payload, null, 2)` — the AI can parse structured JSON effectively.

### Trigger executor

**Module:** `src/lib/trigger-executor.ts`

**Flow (mirrors task/workflow executor via `executePrompt()`):**
1. Build `ExecutionContext` with `type: "trigger"`, filename, title, model, effort from config
2. Load trigger system prompt from `trigger-prompt.md`, substitute standard placeholders
3. Substitute `{{details}}` in trigger body with serialized payload, plus standard placeholders
4. Call `executePrompt(ctx)` — this handles: ChatThread creation, `generateText()` with full tool access (`createAiTools()`), usage tracking, activity logging, notifications
5. Use `onSuccessOps` / `onErrorOps` callbacks to update `Trigger` row: `lastFiredAt`, `lastRunStatus`, `lastThreadId`

**ExecutionContext extension:** Add `"trigger"` to the `type` union in `executor-shared.ts`. The `executePrompt()` function needs to handle `sourceTriggerFile` when creating the ChatThread (alongside existing `sourceTaskFile` / `sourceWorkflowFile`).

**Concurrency:** No protection/dedup — concurrent execution allowed. Multiple events can trigger the same config simultaneously.

**User context:** Same as tasks — runs as the first admin user.

### Webhook system

**API endpoint:** `POST /api/triggers/webhook/{apiKey}`

**Flow:**
1. Look up `Webhook` record by `apiKey` — return 401 if not found or revoked
2. Validate `Content-Type: application/json` — return 400 if not JSON
3. Parse request body as JSON — return 400 if invalid
4. Update `Webhook.lastReceivedAt` timestamp
5. Call `fireTrigger(webhook.type, parsedBody)` — fire-and-forget
6. Return `200 OK` immediately with `{ ok: true }`

**Route file:** `src/routes/api/triggers/webhook/$apiKey.ts`

**Webhook management (server functions in `src/lib/trigger.functions.ts`):**
- `getWebhooks()` — list all webhooks for the current user
- `createWebhook({ name, type })` — generate a new webhook with a random API key (use `crypto.randomUUID()` or similar)
- `revokeWebhook({ id })` — soft-delete or hard-delete the webhook
- `regenerateWebhookKey({ id })` — generate a new API key for an existing webhook

**Webhook URL display:** The UI shows the full URL: `{baseUrl}/api/triggers/webhook/{apiKey}` with a copy button. The base URL is derived from the request or an env var.

**Security notes:**
- API key in URL path — sufficient for now
- Future consideration: HMAC signature verification (e.g. `X-Hub-Signature-256` for GitHub) — not in v1
- No rate limiting in v1 — revisit if abuse becomes a concern

### Plugin trigger types

**New type on `AetherPlugin`:**

```typescript
type PluginTriggerType = {
  /** Trigger type key — will be namespaced as {pluginId}:{type} */
  type: string;
  /** Display label, e.g., "New Email Received" */
  label: string;
  /** Description of what this trigger fires on — shown in unconfigured triggers UI */
  description: string;
  /** Markdown instructions: what {{details}} looks like, tips for writing prompts */
  instructions?: string;
};
```

**Extension to `AetherPlugin`:**

```typescript
type AetherPlugin = {
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
  fireTrigger: (type: string, payload: Record<string, unknown>) => void;
};
```

**How it works:**
1. Plugin declares `triggerTypes` in its definition (e.g., IMAP plugin declares `{ type: "new_email", label: "New Email Received", description: "Fires when a new unread email is detected" }`)
2. Plugin calls `ctx.fireTrigger("new_email", { from: "alice@example.com", subject: "Meeting notes", body: "..." })` when the event occurs
3. The context implementation calls the dispatcher with type `{pluginId}:{type}` (e.g., `imap_email:new_email`)
4. Dispatcher matches against trigger configs with `type: imap_email:new_email`

**When plugins fire triggers:** Up to each plugin. The IMAP plugin might fire on health check if new unread mail is detected. The trigger system doesn't prescribe when — it only provides the `fireTrigger()` mechanism.

### Schema migration

**New `Trigger` model:**

```prisma
model Trigger {
  id             String    @id @default(cuid())
  filename       String    @unique          // e.g. "github-push.md"
  title          String                     // from frontmatter at last sync
  type           String                     // e.g. "github", "imap_email:new_email"
  pattern        String?                    // JMESPath expression
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
  @@index([userId, type])
  @@index([userId, filename])
}
```

**New `Webhook` model:**

```prisma
model Webhook {
  id             String    @id @default(cuid())
  name           String                     // human-readable label, e.g. "GitHub"
  type           String                     // event type string, e.g. "github"
  apiKey         String    @unique          // random key used in URL
  lastReceivedAt DateTime?                  // last time a POST was received
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  userId         String
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@index([apiKey])
}
```

**`ChatThread` changes:**
- `type` extended with `"trigger"` value (alongside existing `chat`, `task`, `workflow`)
- Add column `sourceTriggerFile String?` — the filename of the trigger config that created this thread

**`ChatUsageEvent` changes:**
- `taskType` extended with `"trigger"` value. No schema change needed (already a string field).

**`User` relation:**
- Add `triggers Trigger[]` and `webhooks Webhook[]` relations to `User` model

### Trigger management UI

**Nav:** Add "Triggers" to `primaryLinks` in `Header.tsx` (between Workflows and Obsidian) and to `STATIC_PAGES` in `CommandPalette.tsx`. Icon: `Zap` from lucide-react.

**Route: `/triggers` — Trigger list**
- Data source: `Trigger` table
- Columns: title, type (with human-readable label), pattern (truncated if long), last fired, last status, enabled/disabled
- Row actions: view run history, link to edit file in config editor
- Visual indicators: disabled triggers (dimmed), deleted files (`fileExists: false` — greyed out)
- Pattern: mirrors `/tasks` page with `PageHeader` + `TriggerTable` or `TriggerEmptyState`

**Route: `/triggers/$filename` — Run history**
- Past runs are `ChatThread` records where `sourceTriggerFile` matches
- Each run shows: timestamp, model, duration, token usage, estimated cost, status
- Expandable detail: full prompt (with substituted details), full response (rendered markdown including tool calls/results)
- Delete button per run
- Pattern: mirrors `/tasks/$` page

**Route: `/triggers/editor` — Config editor**
- Uses `ConfigEditorShell` with `subfolder: "triggers"`
- `TriggerFrontmatterDisplay` component shows parsed frontmatter fields
- "New Trigger" dialog for creating new trigger config files
- Unconfigured triggers section (see below)
- Pattern: mirrors `/tasks/editor` page

**Route: `/triggers/webhooks` — Webhook management**
- List of all webhooks with: name, type, full URL (with copy button), last received timestamp, created date
- "Create Webhook" dialog: name (text), type (text)
- Row actions: copy URL, regenerate key (with confirmation), revoke/delete (with confirmation)
- When a webhook is created, show the full URL prominently so the user can copy it

**Unconfigured triggers section (on editor page):**
- Queries all enabled plugins for `triggerTypes`, checks if any trigger config file has a matching `type: {pluginId}:{triggerType}`
- For each unmatched trigger type, shows:
  - Plugin name + icon
  - Trigger type label and description
  - Rendered `instructions` markdown (if provided)
  - "Create Trigger" button — creates a new file with pre-filled frontmatter (`type: {pluginId}:{triggerType}`, `title: {label}`, `enabled: true`) and placeholder body with `{{details}}`
- Hidden when all plugin trigger types have matching configs

## File Structure

```
src/lib/
  triggers/
    trigger.functions.ts                  # Server functions for trigger + webhook UI
  trigger-watcher.ts                      # Watcher + config sync (same pattern as task-scheduler)
  trigger-executor.ts                     # Build ExecutionContext, call executePrompt()
  trigger-dispatcher.ts                   # fireTrigger() — match events to configs, JMESPath filter
  ai-config/validators/trigger.ts         # Zod validators for trigger files
  ai-config/validators/trigger-prompt.ts  # Zod validator for trigger-prompt.md
src/routes/
  triggers/
    index.tsx                             # /triggers list page
    $.tsx                                 # /triggers/:filename run history
    editor/
      index.tsx                           # /triggers/editor config editor
      $.tsx                               # /triggers/editor/:filename config editor (with file selected)
    webhooks.tsx                          # /triggers/webhooks management page
  api/triggers/
    webhook/$apiKey.ts                    # POST webhook endpoint
src/components/
  triggers/
    TriggerTable.tsx                      # Trigger list table
    TriggerEmptyState.tsx                 # Empty state for trigger list
    TriggerRunHistory.tsx                 # Run history component
  config-editor/
    TriggerFrontmatterDisplay.tsx         # Frontmatter display for editor
    TriggerFrontmatterModal.tsx           # Configure modal for trigger frontmatter
    NewTriggerDialog.tsx                  # Dialog for creating new trigger files
  (future)
    WebhookTable.tsx                      # Webhook list table
    CreateWebhookDialog.tsx              # Dialog for creating webhooks
src/plugins/
  types.ts                               # Extended with PluginTriggerType, fireTrigger on PluginContext
```

## Open Questions

- **JMESPath library choice:** Need to evaluate TypeScript-compatible JMESPath libraries for bundle size and correctness. Candidates: `@metrichor/jmespath`, `jmespath` (original), or a lighter alternative.

## Resolved Questions

- ~~**Webhook vs file_change as first trigger source:**~~ Resolved: Webhook first. File change trigger deferred — not needed for v1.
- ~~**Webhook security model:**~~ Resolved: API key in URL path for v1. HMAC signature verification (e.g. GitHub's `X-Hub-Signature-256`) noted as future exploration.
- ~~**Pattern matching approach:**~~ Resolved: JMESPath expressions on the raw JSON payload. Omit pattern to match all events of a type.
- ~~**Webhook response behavior:**~~ Resolved: Fire-and-forget. Return 200 immediately, execute triggers async.
- ~~**Plugin trigger types:**~~ Resolved: Plugins declare `triggerTypes` array and use `fireTrigger()` on context. Namespaced as `{pluginId}:{type}`.

## Implementation Plan

| Step | Status | Plan |
| --- | --- | --- |
| 1. Schema migration | done | New `Trigger` model (no Webhook yet), add `sourceTriggerFile` to `ChatThread`, extend type values |
| 2. Trigger file format + validator | done | Zod schema in `ai-config/validators/trigger.ts` + `trigger-prompt.ts`, registered in validator index |
| 3. Trigger system prompt | todo | `trigger-prompt.md` config file, example, config reader with fallback |
| 4. Trigger watcher | todo | Singleton with chokidar on `triggers/`, DB sync, in-memory config Map |
| 5. Event dispatcher | todo | `fireTrigger(type, payload)` function with JMESPath pattern matching |
| 6. Trigger executor | todo | Extend `ExecutionContext` type, wire dispatcher to `executePrompt()`, store results |
| 7. Webhook endpoint | todo | API route at `/api/triggers/webhook/$apiKey`, key lookup, JSON validation, fire-and-forget dispatch |
| 8. Webhook management | todo | Webhook DB model, server functions for CRUD, create/revoke/regenerate keys |
| 9. Plugin integration | todo | Add `triggerTypes` to `AetherPlugin`, `fireTrigger()` to `PluginContext`, wire to dispatcher |
| 10. UI — Trigger list + history | done | `/triggers` list page, `/triggers/$filename` run history, server functions |
| 11. UI — Trigger editor | done | `/triggers/editor` with `ConfigEditorShell`, frontmatter display + modal, new trigger dialog |
| 12. UI — Webhook management page | todo | `/triggers/webhooks` with table, create/revoke/regenerate dialogs |
| 13. UI — Unconfigured triggers | todo | Query plugin trigger types, diff against configs, render missing section on editor page |
| 14. Nav integration | done | Added to header `primaryLinks` and command palette `STATIC_PAGES` with Zap icon |
| 15. CLI updates | todo | Seed/pull for triggers folder + trigger-prompt |

## Change Log

- 2026-03-21: Initial requirements drafted with file_change trigger and plugin integration.
- 2026-03-21: Added custom frontmatter fields, instructions markdown, two-phase validation.
- 2026-04-06: Major rewrite. Replaced file_change trigger with webhook-first approach. Added Webhook DB model and management UI. Switched pattern matching from glob to JMESPath on JSON payloads. Simplified trigger file format (removed custom frontmatter fields — pattern handles filtering). Added webhook API endpoint (fire-and-forget). Plugin integration retained with `triggerTypes` + `fireTrigger()`. Trigger editor mirrors task/workflow editor pattern. HMAC verification and rate limiting deferred to future versions.
- 2026-04-06: Implementation started. Completed: Trigger DB model + schema migration, trigger/trigger-prompt validators, nav integration (Header + CommandPalette), trigger list page, run history page, config editor with frontmatter display/modal, new trigger dialog, server functions for list/history/delete/convert.
