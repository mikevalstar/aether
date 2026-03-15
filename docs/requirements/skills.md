---
title: AI Skills
status: todo
owner: self
last_updated: 2026-03-15
canonical_file: docs/requirements/skills.md
---

# AI Skills

## Purpose

- Problem: The chat AI has a fixed set of capabilities. Adding new behaviors (e.g., "summarize a meeting", "generate a weekly review") requires code changes to the system prompt or new tools.
- Outcome: Skills are markdown files stored in the AI config folder that teach the AI how to perform specific tasks. The AI discovers available skills from a summary list injected into the system prompt, then loads full instructions on demand via a `load_skill` tool. Skills follow the [Agent Skills open standard](https://agentskills.io) file format.
- Related: [System Settings (AI Config)](system-settings.md) — skills live in the same AI config directory and follow the same validation/seed/pull patterns.

## Core Concepts

- **Skills are markdown files** — each skill is a `SKILL.md` file inside a named subfolder of `skills/` in the AI config directory.
- **Two-phase loading** — only skill names and descriptions are injected into the system prompt (Phase 1: discovery). The AI calls `load_skill` to read full instructions when needed (Phase 2: activation). This keeps the context window lean.
- **Agent Skills standard** — skills use `SKILL.md` with YAML frontmatter (`name`, `description`) and a markdown body containing instructions. Optional subdirectories (`references/`, `scripts/`, `assets/`) can hold supporting files.
- **Validated like other config files** — skills are validated with zod (frontmatter has required fields, body is non-empty). Invalid skills are excluded from the summary list and logged as warnings.
- **No code changes to add skills** — users create a new folder with a `SKILL.md` and the AI can use it immediately.

Reference: https://ai-sdk.dev/cookbook/guides/agent-skills

## Skill File Format

```
ai-config/
  skills/
    meeting-summary/
      SKILL.md              # required — frontmatter + instructions
      references/            # optional — detailed docs the AI can read
      assets/                # optional — templates, examples
    weekly-review/
      SKILL.md
    ...
```

### SKILL.md Structure

```markdown
---
name: meeting-summary
description: Use this skill when the user asks to summarize meeting notes or a transcript. Produces a structured summary with action items.
---

## Instructions

1. Ask for the meeting notes or transcript if not provided
2. Extract key discussion points...
3. List action items with owners...
```

### Frontmatter Fields

| Field | Required | Validation |
| --- | --- | --- |
| `name` | yes | Non-empty string, lowercase with hyphens, must match folder name |
| `description` | yes | Non-empty string describing when to use this skill (critical for AI triggering) |

### Body

- Non-empty markdown containing instructions for the AI.
- No structural restrictions — can include headings, lists, examples, etc.
- Should be kept under ~5k tokens for context efficiency.

## Architecture

### Loading Flow

1. **Startup / per-request**: Read all `skills/*/SKILL.md` files from the AI config directory.
2. **Validate**: Parse frontmatter with gray-matter, validate with zod. Skip invalid skills (log warning).
3. **Build summary**: Collect `{ name, description, path }` for each valid skill.
4. **Inject into system prompt**: Append a skills section listing available skills by name and description.
5. **Register `load_skill` tool**: A tool the AI can call to read the full SKILL.md body (frontmatter stripped) for a given skill name.

### System Prompt Injection

Appended to the system prompt after existing content:

```
## Skills

You have access to specialized skills. Use the `load_skill` tool to load a skill's full instructions when the user's request matches a skill's description.

Available skills:
- meeting-summary: Use this skill when the user asks to summarize meeting notes or a transcript...
- weekly-review: Use this skill when the user asks for a weekly summary...
```

### `load_skill` Tool

```typescript
tool({
  description: 'Load a skill to get specialized instructions for a task',
  inputSchema: z.object({
    name: z.string().describe('The skill name to load'),
  }),
  execute: async ({ name }) => {
    // Find skill by name, read SKILL.md, strip frontmatter, return body
    return { name, instructions: body };
  },
});
```

Returns the skill's markdown body so the AI can follow the instructions for the current task.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Skill file format | todo | `SKILL.md` with `name` and `description` frontmatter, markdown body. Follows Agent Skills standard. |
| Skills directory | todo | `skills/` subfolder inside AI config directory. Each skill in its own named subfolder. |
| Skill loader | todo | Server function that reads all `skills/*/SKILL.md` files, validates, returns list of `{ name, description, path }`. |
| Zod validator | todo | Validator for SKILL.md: `name` (non-empty, kebab-case, matches folder name), `description` (non-empty), body (non-empty). |
| System prompt injection | todo | Append skills summary section to system prompt in chat endpoint. List each valid skill's name and description. |
| `load_skill` tool | todo | Tool registered in chat endpoint that reads a skill's full SKILL.md body by name. Returns stripped markdown. |
| Validator integration | todo | Register skill validator in `src/lib/ai-config-validators/` so skills get real-time validation in the Obsidian editor. |
| Example skills | todo | Seed examples in `examples/ai-config/skills/` with at least one sample skill. |
| Seed/pull support | todo | Update seed and pull scripts to handle the `skills/` subdirectory (recursive copy). |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Skill scanner | todo | Read `skills/` directory, find all `SKILL.md` files, parse and validate each. | Inline |
| Skill summary builder | todo | Build the skills prompt section from validated skill metadata. | Inline |
| `load_skill` tool definition | todo | Zod-validated tool that looks up a skill by name and returns its instructions. | Inline |
| Chat endpoint integration | todo | Wire skill summary into system prompt and `load_skill` into tools in `api/chat.ts`. | Inline |
| Skill validator (editor UI) | todo | Validator for SKILL.md so skills show validation feedback in the Obsidian editor. | Inline |
| Example: sample skill | todo | At least one example skill in `examples/ai-config/skills/` demonstrating the format. | Inline |
| Seed script update | todo | `ai-config-seed.ts` recursively copies `skills/` subfolder. | Inline |
| Pull script update | todo | `ai-config-pull.ts` recursively copies `skills/` subfolder back. | Inline |
| Invalid skill handling | todo | Invalid skills are excluded from the summary list. A warning is logged with the skill name and validation errors. | Inline |

## Detail

### Skill Scanner

New function in `src/lib/ai-config.ts`:

```
readAllSkills() → Array<{ name, description, path, body }>
```

- Reads `skills/` subdirectory from AI config dir.
- For each subfolder, reads `SKILL.md`.
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

### Validator for Obsidian Editor

The skill validator is slightly different from other config validators because it applies to files inside `skills/*/SKILL.md` rather than a single known filename. The validator registry may need a pattern-based lookup (e.g., any file matching `skills/*/SKILL.md`) in addition to exact filename matching.

Alternatively, a simpler approach: detect that the file is inside the `skills/` subdirectory and apply the skill validator regardless of exact path.

### Seed/Pull Scripts

Both scripts currently copy flat files from `examples/ai-config/`. They need to handle subdirectories:

- **Seed**: Recursively copy `examples/ai-config/skills/` to the AI config `skills/` directory. Same skip-existing behavior per file.
- **Pull**: Recursively copy `skills/` from live config back to `examples/ai-config/skills/`.

## Implementation Plan

| Step | Status | Plan |
| --- | --- | --- |
| 1. Skill validator | todo | Create `src/lib/ai-config-validators/skill.ts` with zod schema for SKILL.md frontmatter + body. |
| 2. Skill scanner | todo | Add `readAllSkills()` to `src/lib/ai-config.ts` — reads skills dir, validates, returns metadata + body. |
| 3. Skills prompt builder | todo | Function to build the system prompt skills section from skill metadata. |
| 4. `load_skill` tool | todo | Create tool in `src/lib/tools/load-skill.ts` (or inline in chat endpoint). |
| 5. Chat endpoint integration | todo | Wire skills into system prompt and tools in `api/chat.ts`. |
| 6. Editor validation | todo | Update validator registry to handle `skills/*/SKILL.md` pattern matching. |
| 7. Example skills | todo | Create `examples/ai-config/skills/` with a sample skill. |
| 8. Seed/pull scripts | todo | Update both scripts to recursively handle `skills/` subdirectory. |

## Open Questions

- Should there be a maximum number of skills loaded into the summary? At scale, many skills could bloat the system prompt. Could add a `maxSkills` config or prioritization.
- Should `load_skill` return references/assets file listings so the AI knows what supporting files are available? The AI SDK cookbook example returns `skillDirectory` for this purpose.
- Should skills support additional frontmatter fields in the future (e.g., `model` to restrict which models can use a skill, `tags` for categorization)?

## Change Log

- 2026-03-15: Created initial requirements for AI skills with two-phase loading, Agent Skills standard format, validation, and chat integration.
