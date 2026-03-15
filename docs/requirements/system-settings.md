---
title: System Settings (AI Config)
status: in-progress
owner: self
last_updated: 2026-03-14
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
- **Config library split for server/client safety** — `src/lib/ai-config.shared.ts` (parsing + validation, no Node deps) and `src/lib/ai-config.ts` (server-only, filesystem reads). Server functions in `src/lib/ai-config.functions.ts` bridge the client editor to server-side validation.

## Config File Types

### 1. Chat System Prompt (`system-prompt.md`)

| Field | Location | Validation |
| --- | --- | --- |
| Body content | markdown body | Must contain `{{date}}` and `{{userName}}` placeholders |

- No special frontmatter required.
- Body is the system prompt template. At runtime, `{{date}}` is replaced with today's date and `{{userName}}` with the current user's name.
- Replaces the hardcoded system prompt in `src/routes/api/chat.ts`.

### 2. Title Prompt (`title-prompt.md`)

| Field | Location | Validation |
| --- | --- | --- |
| `model` | frontmatter | Must be a valid model ID from the allowed models list |
| Body content | markdown body | Non-empty string (the title generation prompt) |

- Frontmatter `model` specifies which model to use for title generation (currently hardcoded to Haiku).
- Body is the prompt sent to generate chat titles.
- Replaces the hardcoded title generation in `src/routes/api/chat.ts` (moved from `src/lib/chat.ts` to keep client bundle free of Node deps).

### 3. Jobs (future — `jobs/` subfolder)

| Field | Location | Validation |
| --- | --- | --- |
| `cron` | frontmatter | Valid cron expression |
| `title` | frontmatter | Non-empty string |
| Body content | markdown body | Non-empty string (the AI instruction) |

- Each file in `jobs/` is a scheduled AI task.
- Cron string defines when it runs, title names the job, body tells the AI what to do.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Validator folder | done | `src/lib/ai-config-validators/` with one schema file per config type. |
| Zod schemas | done | Each validator exports a zod schema for frontmatter + body, and a human-readable description derived from the schema. |
| Config library | done | `src/lib/ai-config.ts` — read, parse (gray-matter), validate config files. Shared by editor UI and server consumers. |
| Editor validation UI | done | Real-time validation as user types, errors shown in a helper widget below the editor. |
| Validation description panel | done | Below the editor, show human-readable validation requirements derived from the zod schema. |
| Chat prompt integration | done | Chat endpoint reads `system-prompt.md` from AI config, validates, and uses it instead of hardcoded prompt. Falls back to hardcoded if missing/invalid. |
| Title prompt integration | done | Title generation reads `title-prompt.md` from AI config, validates, uses configured model + prompt. Falls back to hardcoded if missing/invalid. |
| Example configs | done | `examples/ai-config/` folder with seed versions of each config file. |
| Seed CLI script | done | `pnpm ai-config:seed` — copies examples into the Obsidian AI config folder (non-destructive, skip existing). Creates dir if needed. Supports `--overwrite` flag. |
| Pull CLI script | done | `pnpm ai-config:pull` — copies current live configs back into `examples/ai-config/` so the repo knows what's deployed. |
| Jobs folder | todo | Future: `jobs/` subfolder inside AI config with cron-based AI tasks. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Zod schema: system-prompt | done | Validates body contains `{{date}}` and `{{userName}}` placeholders. | Inline |
| Zod schema: title-prompt | done | Validates frontmatter `model` is a valid model ID, body is non-empty. | Inline |
| Human-readable description generator | done | Each validator has a static `description` string in markdown format. | Inline |
| Real-time editor validation | done | On each content change (400ms debounce), parse frontmatter + body, run zod validation, display errors in widget below editor. | Inline |
| Validation widget UI | done | Panel below editor showing: (1) human-readable requirements, (2) current validation errors. Styled with green/red indicators. | Inline |
| Config reader functions | done | `readAiConfig(filename)` — reads file from AI config dir, parses with gray-matter, validates with matching zod schema, returns typed result. | Inline |
| Fallback behavior | done | All server consumers fall back to hardcoded defaults if config file is missing or fails validation. | Inline |
| Example: system-prompt.md | done | Seed example with default system prompt containing `{{date}}` and `{{userName}}`. | Inline |
| Example: title-prompt.md | done | Seed example with `model` in frontmatter and default title generation prompt. | Inline |
| Seed script | done | `scripts/ai-config-seed.ts` — reads `examples/ai-config/`, copies to `OBSIDIAN_AI_CONFIG` dir, skips existing files unless `--overwrite` is passed. Creates dir if needed. | Inline |
| Pull script | done | `scripts/ai-config-pull.ts` — reads live config files from `OBSIDIAN_AI_CONFIG`, copies to `examples/ai-config/`. | Inline |

## Detail

### Validator Folder Structure

```
src/lib/ai-config-validators/
  index.ts              # registry: maps config filename → schema + description
  system-prompt.ts      # zod schema + description for system-prompt.md
  title-prompt.ts       # zod schema + description for title-prompt.md
  (future) job.ts       # zod schema for job files
```

Each validator file exports an `AiConfigValidator` object with:
- `filename` — expected filename in the AI config directory
- `label` — human-readable name
- `description` — markdown-formatted validation requirements
- `validate(frontmatter, body)` — returns `{ isValid, errors }`

The index re-exports a registry so consumers can look up the validator by filename.

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
```

**`src/lib/ai-config.functions.ts`** (server functions callable from client):
```
validateAiConfigContent({ filename, rawContent }) → { isValid, errors, description, label }
getAiConfigValidatorInfo({ filename }) → { description, label } | null
```

- `ai-config.shared.ts` uses `gray-matter` to parse frontmatter, looks up the matching validator.
- `ai-config.ts` adds filesystem reads on top (server-only).
- `ai-config.functions.ts` wraps shared parsing in `createServerFn` for the editor UI.
- `CHAT_MODELS` extracted to `src/lib/chat-models.ts` to avoid circular dependency with validators.

### Editor Validation Flow

1. User opens an AI config file in the Obsidian editor.
2. App detects the file is in the AI config directory and looks up its validator.
3. Below the editor, a **requirements panel** shows the human-readable validation description (always visible).
4. As the user types, content is parsed and validated against the zod schema.
5. A **validation widget** below the editor shows current errors (red) or a success indicator (green checkmark).
6. Save button is not blocked by validation (user may want to save work-in-progress), but errors are clearly shown.
7. Server-side consumers re-validate on read, so an invalid config falls back to defaults.

### Example Configs & CLI Scripts

```
examples/ai-config/
  system-prompt.md      # default chat system prompt
  title-prompt.md       # default title generation config
```

**Seed** (`pnpm ai-config:seed`):
- Reads all files from `examples/ai-config/`.
- Copies each to `OBSIDIAN_AI_CONFIG` directory.
- Skips files that already exist (non-destructive), unless `--overwrite` is passed.
- Reports what was copied, overwritten, and skipped.

**Pull** (`pnpm ai-config:pull`):
- Reads known config files from `OBSIDIAN_AI_CONFIG`.
- Copies them into `examples/ai-config/`, overwriting.
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
| 8. Jobs folder | todo | Future: schema, UI, and runner for cron-based AI job files. |

## Open Questions

- For jobs: what runtime/scheduler will execute them — a separate process, or in-app polling?

## Change Log

- 2026-03-14: Created initial requirements for system settings with zod validation, editor UI, config library, example files, and seed/pull CLI scripts.
- 2026-03-14: Implemented all non-jobs requirements — validators, config library (split shared/server for client safety), editor validation UI, chat/title prompt integration, examples, seed/pull scripts. Extracted `CHAT_MODELS` to `chat-models.ts` to break circular dep. Moved `generateChatTitle` to `api/chat.ts` to keep `chat.ts` client-safe. Added `--overwrite` flag to seed script.
