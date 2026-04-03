---
title: AI Skills
status: done
owner: self
last_updated: 2026-04-02
canonical_file: docs/requirements/skills.md
---

# AI Skills

## Purpose

- Problem: The chat AI has a fixed set of capabilities. Adding new behaviors (e.g., "summarize a meeting", "write a workflow") requires code changes to the system prompt or new tools.
- Outcome: Skills are markdown files stored in the `skills/` folder of the AI config directory that teach the AI how to perform specific tasks. The AI discovers available skills from a summary list injected into the system prompt, then loads full instructions on demand via a `load_skill` tool.
- Related: [System Settings (AI Config)](system-settings.md) — skills live in the same AI config directory and follow the same validation/seed/pull patterns.

## Core Concepts

- **Skills are single markdown files** — each skill is one `.md` file in the `skills/` folder of the AI config directory. No subfolders, no special naming conventions.
- **Two-phase loading** — only skill names and descriptions are injected into the system prompt (Phase 1: discovery). The AI calls `load_skill` to read full instructions when needed (Phase 2: activation). This keeps the context window lean.
- **Simple frontmatter** — each skill file has `name` and `description` in its YAML frontmatter, plus a markdown body with the instructions.
- **Validated like other config files** — skills are validated through the shared `parseAndValidateAiConfig()` pipeline in `ai-config.shared.ts`, which uses gray-matter for parsing and delegates to the registered zod-based skill validator. Invalid skills are excluded from the summary list and logged as warnings.
- **No code changes to add skills** — users create a new `.md` file in `skills/` and the AI can use it immediately.

## Skill File Format

```
ai-config/
  skills/
    write-workflow.md
    write-skill.md
    ...
```

### Skill File Structure

```markdown
---
name: Writing Workflows
description: Use this skill when the user asks to create or modify a workflow
---

Instructions for the AI go here. Can include headings, lists, examples, code blocks, etc.
```

### Frontmatter Fields

| Field | Required | Validation |
| --- | --- | --- |
| `name` | yes | Non-empty string. Human-readable display name. |
| `description` | yes | Non-empty string describing when to use this skill (critical for AI triggering). |
| `tags` | no | Array of strings. Used for categorization/grouping in the future. |
| `priority` | no | Integer. Controls ordering in the skills summary list (higher = listed first). Default: 0. |

### Body

- Non-empty markdown containing instructions for the AI.
- No structural restrictions — can include headings, lists, examples, etc.
- Should be kept under ~5k tokens for context efficiency.

## Architecture

### Loading Flow

1. **Per-request**: Read all `.md` files from the `skills/` folder in the AI config directory.
2. **Validate**: Each file is passed through `parseAndValidateAiConfig()` which parses frontmatter with gray-matter and delegates to the registered skill validator (zod schema). Skip invalid skills (log warning with filename and errors via pino logger).
3. **Build summary**: Collect `{ name, description, filename, tags?, priority? }` for each valid skill. Sort by `priority` descending (higher priority listed first, default 0), then alphabetically by `name`.
4. **Inject into system prompt**: Append a skills section listing available skills by name and description.
5. **Register `load_skill` tool**: A tool the AI can call to read the full skill body (frontmatter stripped) for a given skill filename. Only registered when at least one valid skill exists.

### System Prompt Injection

Appended to the system prompt after existing content:

```
## Skills

You have access to specialized skills. Use the `load_skill` tool to load a skill's full instructions when the user's request matches a skill's description or you feel the skill will be useful for your current task.

Available Skills:
<Skills>
- write-workflow.md: Use this skill when the user asks to create or modify a workflow
- write-skill.md: Use this skill when the user asks to create, modify, or understand how to write an AI skill file
- write-task.md: Use this skill when the user asks to create, modify, or schedule a periodic/recurring task
</Skills>
```

### `load_skill` Tool

Implemented as a factory function `createLoadSkill(skills)` in `src/lib/tools/load-skill.ts`:

```typescript
tool({
  description: 'Load a skill to get specialized instructions for a task',
  inputSchema: z.object({
    filename: z.string().describe('The skill filename to load (e.g. write-workflow.md)'),
  }),
  execute: async ({ filename }) => {
    const skill = skills.find((s) => s.filename === filename);
    if (!skill) {
      return { error: `Skill "${filename}" not found. Available skills: ${skills.map((s) => s.filename).join(", ")}` };
    }
    return { name: skill.name, instructions: skill.body };
  },
});
```

Returns the skill's markdown body so the AI can follow the instructions for the current task. If the requested skill is not found, returns an error message listing available skill filenames.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Skill file format | done | `.md` files with `name` and `description` frontmatter, markdown body. |
| Skills directory | done | `skills/` folder inside AI config directory. Flat structure — one file per skill. |
| Skill loader | done | `readAllSkills()` in `src/lib/skills.ts` reads all `skills/*.md` files, validates via shared pipeline, returns list of `{ name, description, filename, body, tags?, priority? }`. |
| Zod validator | done | `skillFrontmatterSchema` in `src/lib/ai-config-validators/skill.ts`: `name` (non-empty), `description` (non-empty), `tags` (optional string array), `priority` (optional integer). Body non-empty check in validator function. |
| System prompt injection | done | `buildSkillsPromptSection()` in `src/lib/skills.ts` appends skills summary section to system prompt. Wired in `src/routes/api/chat.ts`. |
| `load_skill` tool | done | `createLoadSkill()` factory in `src/lib/tools/load-skill.ts`. Registered in chat endpoint when skills exist. |
| Validator integration | done | `skillValidator` registered in `src/lib/ai-config-validators/index.ts` with `filename: "skills/"` (directory prefix matching). |
| Example skills | done | Three seed examples in `examples/ai-config/skills/`: `write-workflow.md`, `write-skill.md`, and `write-task.md`. |
| Seed/pull support | done | Both `scripts/ai-config-seed.ts` and `scripts/ai-config-pull.ts` use recursive directory copying that naturally handles the `skills/` subfolder. No skill-specific code was needed. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Skill scanner | done | `readAllSkills()` reads `skills/` directory, finds all `.md` files, validates each via `parseAndValidateAiConfig()`. | Inline |
| Skill summary builder | done | `buildSkillsPromptSection()` builds the skills prompt section from validated skill metadata. | Inline |
| `load_skill` tool definition | done | `createLoadSkill()` factory creates a zod-validated tool that looks up a skill by filename and returns its instructions. | Inline |
| Chat endpoint integration | done | Skill summary wired into system prompt and `load_skill` into tools in `src/routes/api/chat.ts`. Skills loaded in parallel with system prompt via `Promise.all`. | Inline |
| Skill validator (config validation) | done | `skillValidator` in `src/lib/ai-config-validators/skill.ts` validates skill files for config validation feedback. | Inline |
| Example: write-workflow skill | done | Example skill in `examples/ai-config/skills/write-workflow.md` demonstrating the format with a comprehensive workflow-writing guide. | Inline |
| Example: write-skill skill | done | Example skill in `examples/ai-config/skills/write-skill.md` demonstrating how to write skill files themselves (self-referential). | Inline |
| Example: write-task skill | done | Example skill in `examples/ai-config/skills/write-task.md` teaching the AI how to create and configure scheduled task files. | Inline |
| Seed script update | done | `ai-config-seed.ts` recursively copies `skills/` folder (generic recursive copy, no skill-specific code). | Inline |
| Pull script update | done | `ai-config-pull.ts` recursively copies `skills/` folder back (generic recursive copy, no skill-specific code). | Inline |
| Invalid skill handling | done | Invalid skills are excluded from the summary list. A warning is logged via pino with the filename and validation errors. | Inline |

## Detail

### Skill Scanner

Function in `src/lib/skills.ts`:

```
readAllSkills() → Promise<SkillEntry[]>
```

Types: `SkillSummary = { name, description, filename, tags?, priority? }`, `SkillEntry = SkillSummary & { body }`.

- Resolves the skills directory from `OBSIDIAN_DIR` + `OBSIDIAN_AI_CONFIG` env vars + `skills/` suffix.
- Reads all `.md` files from that directory.
- Validates each file through `parseAndValidateAiConfig()` (shared pipeline using gray-matter + registered validator).
- Returns only valid skills, sorted by priority descending then name alphabetically. Logs warnings for invalid ones via pino.

### Skill Summary Builder

Function in `src/lib/skills.ts`:

```
buildSkillsPromptSection(skills: SkillEntry[]) → string
```

- Takes the list of valid skills.
- Returns the markdown section to append to the system prompt.
- If no skills are found, returns empty string (no section added).

### Chat Endpoint Changes

In `src/routes/api/chat.ts`:

1. Call `readAllSkills()` in parallel with `readSystemPrompt()` via `Promise.all`.
2. Append `buildSkillsPromptSection(skills)` to the system prompt (before plugin prompt sections).
3. Conditionally add `load_skill` to the tools object (only when `skills.length > 0`), using `createLoadSkill(skills)`.

### Seed/Pull Scripts

Both scripts use generic recursive directory copying (`copyDir` / `pullDir`) that handles any subfolder structure, including `skills/`. No skill-specific code changes were needed.

- **Seed**: Recursively copies `examples/ai-config/` (including `skills/`) to the AI config directory. Same skip-existing behavior per file.
- **Pull**: Recursively copies from live config (including `skills/`) back to `examples/ai-config/`.

## Implementation Plan

| Step | Status | Plan |
| --- | --- | --- |
| 1. Skill validator | done | Created `src/lib/ai-config-validators/skill.ts` with zod schema for skill frontmatter + body validation. |
| 2. Skill scanner | done | Added `readAllSkills()` to `src/lib/skills.ts` — reads skills dir, validates via shared pipeline, returns metadata + body. |
| 3. Skills prompt builder | done | `buildSkillsPromptSection()` in `src/lib/skills.ts` builds the system prompt skills section from skill metadata. |
| 4. `load_skill` tool | done | Created `createLoadSkill()` factory in `src/lib/tools/load-skill.ts`. |
| 5. Chat endpoint integration | done | Wired skills into system prompt and tools in `src/routes/api/chat.ts`. |
| 6. Config validation | done | Registered `skillValidator` in `src/lib/ai-config-validators/index.ts` with directory prefix matching (`"skills/"`). |
| 7. Example skills | done | Three examples in `examples/ai-config/skills/`: `write-workflow.md`, `write-skill.md`, and `write-task.md`. |
| 8. Seed/pull scripts | done | Already handled by existing recursive copy logic — no changes needed. |

## Open Questions

None currently.

## Change Log

- 2026-04-02: Added third example skill `write-task.md` for creating/scheduling periodic tasks.
- 2026-03-22: Updated all statuses to done. Documented actual file locations, implementation details, and the second example skill (`write-skill.md`).
- 2026-03-20: Simplified to flat single-file model — skills are individual `.md` files in `skills/` instead of subfolders with `SKILL.md`. Dropped Agent Skills standard requirement. Frontmatter uses `name` (human-readable) and `description`.
- 2026-03-15: Created initial requirements for AI skills with two-phase loading, Agent Skills standard format, validation, and chat integration.
