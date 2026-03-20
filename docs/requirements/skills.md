---
title: AI Skills
status: todo
owner: self
last_updated: 2026-03-20
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
- **Validated like other config files** — skills are validated with zod (frontmatter has required fields, body is non-empty). Invalid skills are excluded from the summary list and logged as warnings.
- **No code changes to add skills** — users create a new `.md` file in `skills/` and the AI can use it immediately.

## Skill File Format

```
ai-config/
  skills/
    write-workflow.md
    meeting-summary.md
    weekly-review.md
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

1. **Startup / per-request**: Read all `.md` files from the `skills/` folder in the AI config directory.
2. **Validate**: Parse frontmatter with gray-matter, validate with zod. Skip invalid skills (log warning).
3. **Build summary**: Collect `{ name, description, filename, tags?, priority? }` for each valid skill. Sort by `priority` descending (higher priority listed first, default 0).
4. **Inject into system prompt**: Append a skills section listing available skills by name and description.
5. **Register `load_skill` tool**: A tool the AI can call to read the full skill body (frontmatter stripped) for a given skill filename.

### System Prompt Injection

Appended to the system prompt after existing content:

```
## Skills

You have access to specialized skills. Use the `load_skill` tool to load a skill's full instructions when the user's request matches a skill's description or you feel the skill will be useful for your current task.

Available Skills:
<Skills>
- write-workflow.md: Use this skill when the user asks to create or modify a workflow
- meeting-summary.md: Use this skill when the user asks to summarize meeting notes or a transcript...
</Skills>
```

### `load_skill` Tool

```typescript
tool({
  description: 'Load a skill to get specialized instructions for a task',
  inputSchema: z.object({
    filename: z.string().describe('The skill filename to load'),
  }),
  execute: async ({ filename }) => {
    // Find skill by filename, read file, strip frontmatter, return body
    return { name, instructions: body };
  },
});
```

Returns the skill's markdown body so the AI can follow the instructions for the current task.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Skill file format | todo | `.md` files with `name` and `description` frontmatter, markdown body. |
| Skills directory | todo | `skills/` folder inside AI config directory. Flat structure — one file per skill. |
| Skill loader | todo | Server function that reads all `skills/*.md` files, validates, returns list of `{ name, description, filename }`. |
| Zod validator | todo | Validator for skill files: `name` (non-empty), `description` (non-empty), `tags` (optional string array), `priority` (optional integer), body (non-empty). |
| System prompt injection | todo | Append skills summary section to system prompt in chat endpoint. List each valid skill's filename and description. |
| `load_skill` tool | todo | Tool registered in chat endpoint that reads a skill's full body by filename. Returns stripped markdown. |
| Validator integration | todo | Register skill validator in `src/lib/ai-config-validators/` so skills get validation feedback. |
| Example skills | todo | Seed examples in `examples/ai-config/skills/` with at least one sample skill. |
| Seed/pull support | todo | Update seed and pull scripts to handle the `skills/` folder. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Skill scanner | todo | Read `skills/` directory, find all `.md` files, parse and validate each. | Inline |
| Skill summary builder | todo | Build the skills prompt section from validated skill metadata. | Inline |
| `load_skill` tool definition | todo | Zod-validated tool that looks up a skill by filename and returns its instructions. | Inline |
| Chat endpoint integration | todo | Wire skill summary into system prompt and `load_skill` into tools in `api/chat.ts`. | Inline |
| Skill validator (config validation) | todo | Validator for skill files so they show validation feedback. | Inline |
| Example: write-workflow skill | todo | Example skill in `examples/ai-config/skills/write-workflow.md` demonstrating the format. | Inline |
| Seed script update | todo | `ai-config-seed.ts` copies `skills/` folder. | Inline |
| Pull script update | todo | `ai-config-pull.ts` copies `skills/` folder back. | Inline |
| Invalid skill handling | todo | Invalid skills are excluded from the summary list. A warning is logged with the filename and validation errors. | Inline |

## Detail

### Skill Scanner

New function in `src/lib/ai-config.ts`:

```
readAllSkills() → Array<{ name, description, filename, body, tags?, priority? }>
```

- Reads all `.md` files from `skills/` in the AI config directory.
- Parses frontmatter and validates with zod.
- Returns only valid skills. Logs warnings for invalid ones.

### Skill Summary Builder

New function (likely in `src/lib/ai-config.ts` or a dedicated `src/lib/skills.ts`):

```
buildSkillsPromptSection(skills) → string
```

- Takes the list of valid skills.
- Returns the markdown section to append to the system prompt.
- If no skills are found, returns empty string (no section added).

### Chat Endpoint Changes

In `src/routes/api/chat.ts`:

1. Call `readAllSkills()` alongside `readSystemPrompt()`.
2. Append `buildSkillsPromptSection(skills)` to the system prompt.
3. Add `load_skill` to the tools object, with a closure over the loaded skills list.

### Seed/Pull Scripts

Both scripts currently copy flat files from `examples/ai-config/`. The `skills/` folder is also flat (just `.md` files), so the same copy logic applies — just needs to handle the subfolder.

- **Seed**: Copy `examples/ai-config/skills/*.md` to the AI config `skills/` directory. Same skip-existing behavior per file.
- **Pull**: Copy `skills/*.md` from live config back to `examples/ai-config/skills/`.

## Implementation Plan

| Step | Status | Plan |
| --- | --- | --- |
| 1. Skill validator | todo | Create `src/lib/ai-config-validators/skill.ts` with zod schema for skill frontmatter + body. |
| 2. Skill scanner | todo | Add `readAllSkills()` to `src/lib/ai-config.ts` — reads skills dir, validates, returns metadata + body. |
| 3. Skills prompt builder | todo | Function to build the system prompt skills section from skill metadata. |
| 4. `load_skill` tool | todo | Create tool in `src/lib/tools/load-skill.ts` (or inline in chat endpoint). |
| 5. Chat endpoint integration | todo | Wire skills into system prompt and tools in `api/chat.ts`. |
| 6. Config validation | todo | Register skill validator in `src/lib/ai-config-validators/`. |
| 7. Example skills | todo | Ensure `examples/ai-config/skills/write-workflow.md` exists as the sample skill. |
| 8. Seed/pull scripts | todo | Update both scripts to handle `skills/` folder. |

## Open Questions

None currently.

## Change Log

- 2026-03-20: Simplified to flat single-file model — skills are individual `.md` files in `skills/` instead of subfolders with `SKILL.md`. Dropped Agent Skills standard requirement. Frontmatter uses `name` (human-readable) and `description`.
- 2026-03-15: Created initial requirements for AI skills with two-phase loading, Agent Skills standard format, validation, and chat integration.
