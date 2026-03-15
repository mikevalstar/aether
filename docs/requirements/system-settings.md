---
title: System Settings (AI Config)
status: todo
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
- **Shared config library** — `src/lib/ai-config.ts` — functions to read, parse, and validate config files. Used by the editor UI and by server-side consumers (chat endpoint, future jobs runner).

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
- Replaces the hardcoded title generation in `src/lib/chat.ts`.

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
| Validator folder | todo | `src/lib/ai-config-validators/` with one schema file per config type. |
| Zod schemas | todo | Each validator exports a zod schema for frontmatter + body, and a human-readable description derived from the schema. |
| Config library | todo | `src/lib/ai-config.ts` — read, parse (gray-matter), validate config files. Shared by editor UI and server consumers. |
| Editor validation UI | todo | Real-time validation as user types, errors shown in a helper widget below the editor. |
| Validation description panel | todo | Below the editor, show human-readable validation requirements derived from the zod schema. |
| Chat prompt integration | todo | Chat endpoint reads `system-prompt.md` from AI config, validates, and uses it instead of hardcoded prompt. Falls back to hardcoded if missing/invalid. |
| Title prompt integration | todo | Title generation reads `title-prompt.md` from AI config, validates, uses configured model + prompt. Falls back to hardcoded if missing/invalid. |
| Example configs | todo | `examples/ai-config/` folder with seed versions of each config file. |
| Seed CLI script | todo | `pnpm ai-config:seed` — copies examples into the Obsidian AI config folder (non-destructive, skip existing). |
| Pull CLI script | todo | `pnpm ai-config:pull` — copies current live configs back into `examples/ai-config/` so the repo knows what's deployed. |
| Jobs folder | todo | Future: `jobs/` subfolder inside AI config with cron-based AI tasks. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Zod schema: system-prompt | todo | Validates body contains `{{date}}` and `{{userName}}` placeholders. | Inline |
| Zod schema: title-prompt | todo | Validates frontmatter `model` is a valid model ID, body is non-empty. | Inline |
| Human-readable description generator | todo | Function that takes a zod schema + config type and returns a user-friendly description of what's expected. | Inline |
| Real-time editor validation | todo | On each content change, parse frontmatter + body, run zod validation, display errors in widget below editor. | Inline |
| Validation widget UI | todo | Panel below editor showing: (1) human-readable requirements, (2) current validation errors with line-level hints. Styled to match app theme. | Inline |
| Config reader functions | todo | `readAiConfig(filename)` — reads file from AI config dir, parses with gray-matter, validates with matching zod schema, returns typed result. | Inline |
| Fallback behavior | todo | All server consumers fall back to hardcoded defaults if config file is missing or fails validation. Log a warning. | Inline |
| Example: system-prompt.md | todo | Seed example with default system prompt containing `{{date}}` and `{{userName}}`. | Inline |
| Example: title-prompt.md | todo | Seed example with `model` in frontmatter and default title generation prompt. | Inline |
| Seed script | todo | `scripts/ai-config-seed.ts` — reads `examples/ai-config/`, copies to `OBSIDIAN_AI_CONFIG` dir, skips files that already exist. | Inline |
| Pull script | todo | `scripts/ai-config-pull.ts` — reads live config files from `OBSIDIAN_AI_CONFIG`, copies to `examples/ai-config/`. | Inline |

## Detail

### Validator Folder Structure

```
src/lib/ai-config-validators/
  index.ts              # registry: maps config filename → schema + description
  system-prompt.ts      # zod schema + description for system-prompt.md
  title-prompt.ts       # zod schema + description for title-prompt.md
  (future) job.ts       # zod schema for job files
```

Each validator file exports:
- `schema` — zod object that validates `{ frontmatter: Record<string, unknown>, body: string }`
- `description` — human-readable string (or structured object) describing what the validator expects, derived from the schema

The index re-exports a registry so consumers can look up the validator by filename.

### Config Library (`src/lib/ai-config.ts`)

```
readAiConfig(filename: string) → { frontmatter, body, errors?, isValid }
validateAiConfig(filename: string, rawContent: string) → { errors?, isValid }
getAiConfigDescription(filename: string) → string
```

- Uses `gray-matter` to parse frontmatter from raw markdown.
- Looks up the matching validator from the registry.
- Returns typed, validated config or validation errors.
- Server functions use `readAiConfig()` to load configs at runtime.
- Editor UI uses `validateAiConfig()` for real-time feedback and `getAiConfigDescription()` for the hint panel.

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
- Skips files that already exist (non-destructive).
- Reports what was copied and what was skipped.

**Pull** (`pnpm ai-config:pull`):
- Reads known config files from `OBSIDIAN_AI_CONFIG`.
- Copies them into `examples/ai-config/`, overwriting.
- Keeps the repo examples in sync with what's actually live.

## Implementation Plan

| Step | Status | Plan |
| --- | --- | --- |
| 1. Validator folder + schemas | todo | Create `src/lib/ai-config-validators/` with system-prompt and title-prompt schemas. |
| 2. Config library | todo | Create `src/lib/ai-config.ts` with read, validate, and description functions. |
| 3. Example configs | todo | Create `examples/ai-config/` with seed files for both config types. |
| 4. Seed + pull scripts | todo | Create `scripts/ai-config-seed.ts` and `scripts/ai-config-pull.ts`, add pnpm scripts. |
| 5. Editor validation UI | todo | Detect AI config files in editor, show requirements panel + real-time validation widget below editor. |
| 6. Chat prompt integration | todo | Update `src/routes/api/chat.ts` to read system-prompt.md via config library, fall back to hardcoded. |
| 7. Title prompt integration | todo | Update `src/lib/chat.ts` to read title-prompt.md via config library, use configured model, fall back to hardcoded. |
| 8. Jobs folder | todo | Future: schema, UI, and runner for cron-based AI job files. |

## Open Questions

- Should the validation widget block save, or just warn? (Current plan: warn only, server falls back to defaults.)
- Should the seed script create the AI config directory if it doesn't exist?
- For jobs: what runtime/scheduler will execute them — a separate process, or in-app polling?

## Change Log

- 2026-03-14: Created initial requirements for system settings with zod validation, editor UI, config library, example files, and seed/pull CLI scripts.
