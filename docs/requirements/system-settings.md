---
title: System Settings (AI Config)
status: done
owner: self
last_updated: 2026-03-22
canonical_file: docs/requirements/system-settings.md
---

# System Settings (AI Config)

## Purpose

- Problem: Chat system prompts, title generation config, and future AI job definitions are hardcoded. There's no way to tweak them without code changes.
- Outcome: System settings live as markdown files in the Obsidian AI config folder (`OBSIDIAN_AI_CONFIG`). They are editable inline in the Obsidian UI with real-time zod-driven validation and human-readable validation hints. A shared config library reads and validates these files for use across the app.
- Related: [Obsidian Integration](obsidian.md) — settings use the existing AI config section of the Obsidian tree and the existing editor infrastructure.

## Core Concepts

- **Config files are markdown** — frontmatter holds structured settings (model, cron, etc.), body holds prompt templates or instructions.
- **Zod is the validation source of truth** — every config type has a zod schema that validates both frontmatter and body content.
- **Human-readable validation** — a description of what the validator expects is derived from the zod schema and shown to the user below the editor.
- **Real-time feedback** — validation runs as the user types, errors displayed in a helper widget below the editor.
- **Validators live in a dedicated folder** — `src/lib/ai-config-validators/` — one file per config type, easy to add more later.
- **Directory-based validators** — validators can match by directory prefix (e.g. `tasks/`, `workflows/`, `skills/`) so all files in a subdirectory share the same schema.
- **Config library split for server/client safety** — `src/lib/ai-config.shared.ts` (parsing + validation, no Node deps) and `src/lib/ai-config.ts` (server-only, filesystem reads). Server functions in `src/lib/ai-config.functions.ts` bridge the client editor to server-side validation.

## Config File Types

### 1. Chat System Prompt (`system-prompt.md`)

| Field | Location | Validation |
| --- | --- | --- |
| Body content | markdown body | Must contain `{{date}}`, `{{userName}}`, and `{{aiMemoryPath}}` placeholders |

- No special frontmatter required.
- Body is the system prompt template. At runtime, `{{date}}` is replaced with today's date, `{{userName}}` with the current user's name, and `{{aiMemoryPath}}` with the AI memory folder path (from `OBSIDIAN_AI_MEMORY` env var).
- Replaces the hardcoded system prompt in `src/routes/api/chat.ts`.

### 2. Title Prompt (`title-prompt.md`)

| Field | Location | Validation |
| --- | --- | --- |
| `model` | frontmatter | Must be a valid model ID from the allowed models list |
| Body content | markdown body | Non-empty string (the title generation prompt) |

- Frontmatter `model` specifies which model to use for title generation (currently hardcoded to Haiku).
- Body is the prompt sent to generate chat titles.
- Replaces the hardcoded title generation in `src/routes/api/chat.ts` (moved from `src/lib/chat.ts` to keep client bundle free of Node deps).

### 3. Task System Prompt (`task-prompt.md`)

| Field | Location | Validation |
| --- | --- | --- |
| `model` | frontmatter | Optional. Must be a valid model ID from the allowed models list |
| `effort` | frontmatter | Optional. One of: `low`, `medium`, `high` |
| Body content | markdown body | Non-empty string (the task system prompt template) |

- Defines the system prompt used for all periodic task executions.
- Body supports `{{date}}`, `{{userName}}`, and `{{aiMemoryPath}}` placeholders, interpolated at runtime.
- Falls back to a hardcoded default if missing or invalid.

### 4. Workflow System Prompt (`workflow-prompt.md`)

| Field | Location | Validation |
| --- | --- | --- |
| `model` | frontmatter | Optional. Must be a valid model ID from the allowed models list |
| `effort` | frontmatter | Optional. One of: `low`, `medium`, `high` |
| Body content | markdown body | Non-empty string (the workflow system prompt template) |

- Defines the system prompt used for all workflow executions.
- Body supports `{{date}}`, `{{userName}}`, and `{{aiMemoryPath}}` placeholders, interpolated at runtime.
- Falls back to a hardcoded default if missing or invalid.

### 5. Periodic Tasks (`tasks/` subfolder)

| Field | Location | Validation |
| --- | --- | --- |
| `title` | frontmatter | Required, non-empty string |
| `cron` | frontmatter | Required, valid 5-field cron expression (min hour dom mon dow) |
| `model` | frontmatter | Optional. Valid model ID |
| `effort` | frontmatter | Optional. One of: `low`, `medium`, `high` |
| `enabled` | frontmatter | Optional. Boolean (default true) |
| `endDate` | frontmatter | Optional. Valid ISO 8601 date string |
| `maxTokens` | frontmatter | Optional. Positive integer output token limit |
| `timezone` | frontmatter | Optional. Valid IANA timezone (e.g. `America/Toronto`). Defaults to server timezone |
| `notification` | frontmatter | Optional. One of: `silent`, `notify`, `push` (default: `notify`) |
| Body content | markdown body | Non-empty string (the AI instruction) |

- Each `.md` file in `tasks/` is a scheduled AI task.
- Cron string defines when it runs, title names the task, body tells the AI what to do.
- Cron validation uses the `croner` library.

### 6. Workflows (`workflows/` subfolder)

| Field | Location | Validation |
| --- | --- | --- |
| `title` | frontmatter | Required, non-empty string |
| `fields` | frontmatter | Required, array of field definitions (at least one) |
| `description` | frontmatter | Optional. Short description shown in the UI |
| `model` | frontmatter | Optional. Valid model ID |
| `effort` | frontmatter | Optional. One of: `low`, `medium`, `high` |
| `maxTokens` | frontmatter | Optional. Positive integer output token limit |
| `notification` | frontmatter | Optional. One of: `silent`, `notify`, `push` (default: `notify`) |
| Body content | markdown body | Non-empty string. Must contain `{{fieldName}}` placeholders for every defined field |

- Each `.md` file in `workflows/` defines a form-based AI workflow.
- **Field definitions** have properties: `name` (required), `label` (required), `type` (optional, default `text`), `required` (optional, default `true`), `placeholder` (optional), `options` (optional, required for `select` type), `default` (optional).
- **Field types:** `text`, `textarea`, `url`, `select`.
- Validation enforces: unique field names, select fields have non-empty `options`, every field has a `{{name}}` placeholder in the body.

### 7. Skills (`skills/` subfolder)

| Field | Location | Validation |
| --- | --- | --- |
| `name` | frontmatter | Required, non-empty string |
| `description` | frontmatter | Required, non-empty string (used by AI to decide when to load the skill) |
| `tags` | frontmatter | Optional. Array of strings for categorization |
| `priority` | frontmatter | Optional. Integer controlling ordering (higher = listed first, default: 0) |
| Body content | markdown body | Non-empty string (the skill instructions) |

- Each `.md` file in `skills/` defines an AI skill — specialized instructions the AI can load on demand.
- Skills are discovered automatically and loaded via the `load_skill` tool during chat conversations.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Validator folder | done | `src/lib/ai-config-validators/` with one schema file per config type. |
| Validator types | done | `src/lib/ai-config-validators/types.ts` defines `AiConfigValidator` and `AiConfigValidationResult` types. |
| Directory-based validators | done | Validators can match by directory prefix (e.g. `tasks/`) so all files in a subdirectory share the same schema. |
| Zod schemas | done | Each validator exports a zod schema for frontmatter + body, and a human-readable description derived from the schema. |
| Config library | done | `src/lib/ai-config.ts` — read, parse (gray-matter), validate config files. Shared by editor UI and server consumers. |
| Editor validation UI | done | Real-time validation as user types, errors shown in a helper widget below the editor. |
| Validation description panel | done | Below the editor, show human-readable validation requirements derived from the zod schema. |
| Chat prompt integration | done | Chat endpoint reads `system-prompt.md` from AI config, validates, and uses it instead of hardcoded prompt. Falls back to hardcoded if missing/invalid. |
| Title prompt integration | done | Title generation reads `title-prompt.md` from AI config, validates, uses configured model + prompt. Falls back to hardcoded if missing/invalid. |
| Task prompt integration | done | Task executor reads `task-prompt.md` from AI config, validates, uses configured model/effort + prompt. Falls back to hardcoded if missing/invalid. |
| Workflow prompt integration | done | Workflow executor reads `workflow-prompt.md` from AI config, validates, uses configured model/effort + prompt. Falls back to hardcoded if missing/invalid. |
| Task definitions | done | `tasks/` subfolder inside AI config with cron-based scheduled AI tasks. Validated by `task.ts` validator. |
| Workflow definitions | done | `workflows/` subfolder inside AI config with form-based AI workflows. Validated by `workflow.ts` validator. |
| Skill definitions | done | `skills/` subfolder inside AI config with on-demand AI skills. Validated by `skill.ts` validator. |
| Example configs | done | `examples/ai-config/` folder with seed versions of each config file, including subdirectories for tasks, workflows, and skills. |
| Seed CLI script | done | `pnpm ai-config:seed` — recursively copies examples into the Obsidian AI config folder (non-destructive, skip existing). Creates dirs if needed. Supports `--overwrite` flag. |
| Pull CLI script | done | `pnpm ai-config:pull` — recursively copies current live configs (`.md` files) back into `examples/ai-config/` so the repo knows what's deployed. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Zod schema: system-prompt | done | Validates body contains `{{date}}`, `{{userName}}`, and `{{aiMemoryPath}}` placeholders. | Inline |
| Zod schema: title-prompt | done | Validates frontmatter `model` is a valid model ID, body is non-empty. | Inline |
| Zod schema: task-prompt | done | Validates optional frontmatter `model` and `effort`, body is non-empty. | Inline |
| Zod schema: workflow-prompt | done | Validates optional frontmatter `model` and `effort`, body is non-empty. | Inline |
| Zod schema: task | done | Validates required `title` and `cron`, optional `model`/`effort`/`enabled`/`endDate`/`maxTokens`/`timezone`/`notification`. Cron validated via `croner`. Body non-empty. | Inline |
| Zod schema: workflow | done | Validates required `title` and `fields` array, optional `description`/`model`/`effort`/`maxTokens`/`notification`. Unique field names, select fields require options, body must contain all field placeholders. | Inline |
| Zod schema: skill | done | Validates required `name` and `description`, optional `tags` and `priority`. Body non-empty. | Inline |
| Human-readable description generator | done | Each validator has a static `description` string in markdown format. | Inline |
| Real-time editor validation | done | On each content change (400ms debounce), parse frontmatter + body, run zod validation, display errors in widget below editor. | Inline |
| Validation widget UI | done | Panel below editor showing: (1) human-readable requirements, (2) current validation errors. Styled with green/red indicators. | Inline |
| Config reader functions | done | `readAiConfig(filename)` — reads file from AI config dir, parses with gray-matter, validates with matching zod schema, returns typed result. | Inline |
| Task prompt reader | done | `readTaskPromptConfig(userName)` — reads `task-prompt.md`, interpolates placeholders, returns `{ model?, effort?, prompt }`. Falls back to hardcoded default. | Inline |
| Workflow prompt reader | done | `readWorkflowPromptConfig(userName)` — reads `workflow-prompt.md`, interpolates placeholders, returns `{ model?, effort?, prompt }`. Falls back to hardcoded default. | Inline |
| Fallback behavior | done | All server consumers fall back to hardcoded defaults if config file is missing or fails validation. | Inline |
| Example: system-prompt.md | done | Seed example with default system prompt containing `{{date}}`, `{{userName}}`, and `{{aiMemoryPath}}`. | Inline |
| Example: title-prompt.md | done | Seed example with `model` in frontmatter and default title generation prompt. | Inline |
| Example: task-prompt.md | done | Seed example with optional `model` and `effort` in frontmatter and default task system prompt. | Inline |
| Example: workflow-prompt.md | done | Seed example with optional `model` and `effort` in frontmatter and default workflow system prompt. | Inline |
| Example: tasks/daily-summary.md | done | Seed example of a periodic task with cron schedule, model, effort, and enabled flag. | Inline |
| Example: workflows/url-to-recipe.md | done | Seed example of a form-based workflow with url and textarea fields. | Inline |
| Example: skills/write-skill.md | done | Seed example skill teaching the AI how to write skill files. | Inline |
| Example: skills/write-workflow.md | done | Seed example skill teaching the AI how to write workflow files. | Inline |
| Seed script | done | `scripts/ai-config-seed.ts` — recursively reads `examples/ai-config/` (including subdirectories), copies to `OBSIDIAN_AI_CONFIG` dir, skips existing files unless `--overwrite` is passed. Creates dirs if needed. | Inline |
| Pull script | done | `scripts/ai-config-pull.ts` — recursively reads live config files (`.md` only) from `OBSIDIAN_AI_CONFIG` (including subdirectories), copies to `examples/ai-config/`. | Inline |

## Detail

### Validator Folder Structure

```
src/lib/ai-config-validators/
  types.ts              # AiConfigValidator and AiConfigValidationResult type definitions
  index.ts              # registry: maps config filename → schema + description, supports directory-based matching
  system-prompt.ts      # zod schema + description for system-prompt.md
  title-prompt.ts       # zod schema + description for title-prompt.md
  task-prompt.ts        # zod schema + description for task-prompt.md
  workflow-prompt.ts    # zod schema + description for workflow-prompt.md
  task.ts               # zod schema + description for tasks/*.md (directory-based)
  workflow.ts           # zod schema + description for workflows/*.md (directory-based)
  skill.ts              # zod schema + description for skills/*.md (directory-based)
```

Each validator file exports an `AiConfigValidator` object with:
- `filename` — expected filename or directory prefix (e.g. `"system-prompt.md"` or `"tasks/"`)
- `label` — human-readable name
- `description` — markdown-formatted validation requirements
- `validate(frontmatter, body)` — returns `{ isValid, errors }`

The index maintains two lookup mechanisms:
- **Exact match** — for specific filenames like `system-prompt.md`
- **Directory prefix match** — for validators with a trailing `/` in their filename (e.g. `tasks/`), matching any file within that subdirectory

The index also exports `getAllValidators()` to retrieve the full list of registered validators.

### Config Library (split for server/client safety)

**`src/lib/ai-config.shared.ts`** (no Node deps, safe for server functions called from client):
```
parseAndValidateAiConfig(filename, rawContent) → { frontmatter, body, rawContent, validation, validator }
```

**`src/lib/ai-config.ts`** (server-only, uses `node:fs`):
```
readAiConfig(filename) → AiConfigReadResult | null
readSystemPrompt(userName) → string | null
readTitlePromptConfig() → { model, prompt } | null
readTaskPromptConfig(userName) → { model?, effort?, prompt }
readWorkflowPromptConfig(userName) → { model?, effort?, prompt }
```

**`src/lib/ai-config.functions.ts`** (server functions callable from client):
```
validateAiConfigContent({ filename, rawContent }) → { isValid, errors, description, label }
getAiConfigValidatorInfo({ filename }) → { description, label } | null
```

- `ai-config.shared.ts` uses `gray-matter` to parse frontmatter, looks up the matching validator.
- `ai-config.ts` adds filesystem reads on top (server-only). Includes hardcoded fallback defaults for task and workflow system prompts.
- `ai-config.functions.ts` wraps shared parsing in `createServerFn` for the editor UI.
- `CHAT_MODELS` extracted to `src/lib/chat-models.ts` to avoid circular dependency with validators.

### Editor Validation Flow

1. User opens an AI config file in the Obsidian editor.
2. App detects the file is in the AI config directory and looks up its validator (by exact filename or directory prefix).
3. Below the editor, a **requirements panel** shows the human-readable validation description (always visible).
4. As the user types, content is parsed and validated against the zod schema.
5. A **validation widget** below the editor shows current errors (red) or a success indicator (green checkmark).
6. Save button is not blocked by validation (user may want to save work-in-progress), but errors are clearly shown.
7. Server-side consumers re-validate on read, so an invalid config falls back to defaults.

### Example Configs & CLI Scripts

```
examples/ai-config/
  system-prompt.md          # default chat system prompt
  title-prompt.md           # default title generation config
  task-prompt.md            # default task system prompt
  workflow-prompt.md        # default workflow system prompt
  tasks/
    daily-summary.md        # example periodic task
  workflows/
    url-to-recipe.md        # example form-based workflow
  skills/
    write-skill.md          # skill for writing skill files
    write-workflow.md       # skill for writing workflow files
```

**Seed** (`pnpm ai-config:seed`):
- Recursively reads all files from `examples/ai-config/` (including subdirectories).
- Copies each to `OBSIDIAN_AI_CONFIG` directory, preserving folder structure.
- Skips files that already exist (non-destructive), unless `--overwrite` is passed.
- Creates directories if needed.
- Reports what was copied, overwritten, and skipped.

**Pull** (`pnpm ai-config:pull`):
- Recursively reads `.md` files from `OBSIDIAN_AI_CONFIG` (including subdirectories).
- Copies them into `examples/ai-config/`, overwriting and preserving folder structure.
- Keeps the repo examples in sync with what's actually live.

## Implementation Plan

| Step | Status | Plan |
| --- | --- | --- |
| 1. Validator folder + schemas | done | Created `src/lib/ai-config-validators/` with system-prompt and title-prompt schemas. |
| 2. Config library | done | Created `src/lib/ai-config.ts` with read, validate, and description functions. Server functions in `ai-config.functions.ts`. |
| 3. Example configs | done | Created `examples/ai-config/` with seed files for both config types. |
| 4. Seed + pull scripts | done | Created `scripts/ai-config-seed.ts` and `scripts/ai-config-pull.ts`, added pnpm scripts. Seed creates dir if needed. |
| 5. Editor validation UI | done | Detect AI config files in editor, show requirements panel + real-time validation widget below editor. |
| 6. Chat prompt integration | done | Updated `src/routes/api/chat.ts` to read system-prompt.md via config library, fall back to hardcoded. |
| 7. Title prompt integration | done | `generateChatTitle` moved to `src/routes/api/chat.ts`, reads title-prompt.md via config library, uses configured model, falls back to hardcoded. |
| 8. Task prompt config | done | Added `task-prompt.md` validator and `readTaskPromptConfig()` reader with hardcoded fallback. |
| 9. Workflow prompt config | done | Added `workflow-prompt.md` validator and `readWorkflowPromptConfig()` reader with hardcoded fallback. |
| 10. Task definitions | done | Added `tasks/` directory-based validator with full cron/scheduling schema. See [Periodic Tasks](periodic-tasks.md). |
| 11. Workflow definitions | done | Added `workflows/` directory-based validator with form field schema. |
| 12. Skill definitions | done | Added `skills/` directory-based validator. See [Skills](skills.md). |
| 13. Extended examples | done | Added seed examples for task-prompt, workflow-prompt, tasks, workflows, and skills. |
| 14. Recursive seed/pull | done | Updated seed and pull scripts to handle subdirectories recursively. |

## Open Questions

_(None currently open.)_

## Change Log

- 2026-03-14: Created initial requirements for system settings with zod validation, editor UI, config library, example files, and seed/pull CLI scripts.
- 2026-03-14: Implemented all non-jobs requirements — validators, config library (split shared/server for client safety), editor validation UI, chat/title prompt integration, examples, seed/pull scripts. Extracted `CHAT_MODELS` to `chat-models.ts` to break circular dep. Moved `generateChatTitle` to `api/chat.ts` to keep `chat.ts` client-safe. Added `--overwrite` flag to seed script.
- 2026-03-22: Updated requirements to reflect all config types added since initial doc. Added: task-prompt, workflow-prompt, tasks (periodic), workflows (form-based), and skills (on-demand) validators. Documented directory-based validator matching, types extraction to `types.ts`, `getAllValidators()` export, `readTaskPromptConfig()` and `readWorkflowPromptConfig()` reader functions, hardcoded fallback defaults for task/workflow prompts, recursive seed/pull support, and all new example configs (task-prompt.md, workflow-prompt.md, tasks/daily-summary.md, workflows/url-to-recipe.md, skills/write-skill.md, skills/write-workflow.md). Closed open questions about jobs — now implemented as periodic tasks.
