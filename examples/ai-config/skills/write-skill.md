---
name: Writing Skills
description: Use this skill when the user asks to create, modify, or understand how to write an AI skill file
---
# Writing an Aether Skill File

You are writing a skill file for Aether, a personal dashboard app. Skills are markdown files that teach the AI how to perform specific tasks. They are discovered automatically and loaded on demand via the `load_skill` tool during chat conversations.

## File Format

Skill files are markdown (`.md`) with YAML frontmatter. They live in the AI config directory under `skills/`.

```markdown
---
name: Skill Display Name
description: When to use this skill — this is what the AI sees to decide whether to load it
tags:
  - category
priority: 0
---

Instructions for the AI go here.
```

## Frontmatter Reference

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Human-readable display name. Shown in the skills list. |
| `description` | string | Describes when to use this skill. This is injected into the system prompt so the AI can decide whether to load it — make it specific and actionable. |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `tags` | string[] | — | Categorization tags (e.g., `writing`, `research`, `obsidian`). |
| `priority` | integer | `0` | Controls ordering in the skills summary. Higher values are listed first. |

## Body (Instructions)

The markdown body is the full set of instructions the AI receives when it loads the skill. It must be non-empty.

### What to Include

- **Context** — What is the user trying to do? What kind of output do they expect?
- **Step-by-step instructions** — Walk the AI through the process. Be explicit about decisions, formats, and tools to use.
- **File formats and schemas** — If the skill produces structured output (e.g., a config file, a document with frontmatter), document the exact format with field-by-field reference tables.
- **Validation rules** — If there are constraints the output must satisfy, list them so the AI can self-check.
- **Examples** — Include at least one complete example. Two is better: a simple one and a more complex one showing optional fields.
- **Tips and pitfalls** — Common mistakes or best practices the AI should follow.

### What to Avoid

- **Vague instructions** — "Write a good document" is not helpful. Be specific about structure, tone, and format.
- **Excessive length** — Keep skills under ~5,000 tokens. The full body is injected into the conversation context when loaded.
- **Duplicating system prompt content** — Don't repeat instructions that are already in the system prompt (e.g., tool usage basics, personality). Focus on what's unique to this skill.

## How Skills Work at Runtime

1. **Discovery** — The AI sees a one-line summary of each skill (filename + description) in its system prompt.
2. **Loading** — When the AI decides a skill is relevant, it calls `load_skill` with the filename to get the full instructions.
3. **Execution** — The AI follows the loaded instructions to complete the user's request.

The AI has access to all its normal tools (Obsidian vault, web search, file operations, etc.) while following skill instructions.

## Writing a Good Description

The `description` field is the most important part for triggering. The AI uses it to decide whether to load the skill, so it should:

- Start with "Use this skill when..." for clarity
- Mention the specific user intents that should trigger it
- Be specific enough to avoid false positives with other skills

**Good:**
```yaml
description: Use this skill when the user asks to create, modify, or troubleshoot a workflow definition file
```

**Too vague:**
```yaml
description: Helps with workflows
```

**Too narrow:**
```yaml
description: Use when the user says "create a new workflow"
```

## Validation Rules

The system validates skill files automatically. A file must pass all rules to be loaded:

1. `name` is a non-empty string.
2. `description` is a non-empty string.
3. `tags` is an array of strings (if present).
4. `priority` is an integer (if present).
5. The body is non-empty.

Invalid skills are excluded from the summary list and logged as warnings.

## Example: Simple Skill

```markdown
---
name: Meeting Summary
description: Use this skill when the user asks to summarize meeting notes, a transcript, or discussion notes
---
# Meeting Summary

Summarize the provided meeting notes into a structured format.

## Output Format

Create a note in the Obsidian vault at `meetings/YYYY-MM-DD-title.md` with:

### Frontmatter
- `date` — meeting date
- `attendees` — list of participants (if mentioned)
- `tags` — `meeting-notes`

### Sections
1. **Summary** — 2-3 sentence overview
2. **Key Decisions** — Bulleted list of decisions made
3. **Action Items** — Checklist with owners and deadlines where mentioned
4. **Notes** — Any other important points

## Guidelines

- Keep the summary concise and scannable
- Use bullet points over paragraphs
- If attendees aren't mentioned, omit that field
- Ask the user for the meeting notes/transcript if not provided
```

## Example: Skill with Tags and Priority

```markdown
---
name: Weekly Review
description: Use this skill when the user asks for a weekly review, weekly summary, or wants to reflect on the past week
tags:
  - review
  - obsidian
priority: 5
---
# Weekly Review

Generate a weekly review note by scanning the Obsidian vault for activity from the past 7 days.

## Steps

1. Use `obsidian_search` to find notes modified in the last 7 days
2. Use `obsidian_read` to scan each for key content
3. Check for completed and open tasks (checkboxes)
4. Create a review note at `reviews/weekly/YYYY-WNN.md`

## Review Note Structure

- **Accomplishments** — What got done this week
- **In Progress** — What's still being worked on
- **Open Tasks** — Unchecked items carried forward
- **Notes Created** — List of new notes with one-line summaries
- **Reflection** — Brief observations or patterns noticed

## Guidelines

- Focus on what changed, not exhaustive listings
- Group related items together
- Keep the tone neutral and factual
- If very little activity, note that briefly rather than padding
```

## Naming Conventions

- Use **kebab-case** for filenames (e.g., `meeting-summary.md`, `weekly-review.md`)
- Keep filenames short and descriptive
- The filename is what the AI sees in the skills list, so make it recognizable
