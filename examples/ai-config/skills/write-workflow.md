---
name: Writing Workflows
description: Use this skill when the user asks to create or modify a workflow
---
# Writing an Aether Workflow Document

You are writing a workflow document for Aether, a personal dashboard app. Workflows are markdown files with YAML frontmatter that define form-based AI tasks. The user fills out a form, and the AI executes the prompt in the background with access to tools (Obsidian vault, web search, file operations).

## File Format

Workflow files are markdown (`.md`) with YAML frontmatter. They live in the user's AI config directory under `workflows/`.

```markdown
---
title: Workflow Name
description: Short description shown in the UI
model: claude-haiku-4-5
effort: low
maxTokens: 4096
notification: notify
fields:
  - name: fieldName
    label: Human-Readable Label
    type: text
    required: true
    placeholder: "Hint text..."
---

Prompt body goes here. Use {{fieldName}} placeholders to inject form values.
```

## Frontmatter Reference

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Display name for the workflow. Must be non-empty. |
| `fields` | array | At least one form field definition (see below). |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `description` | string | — | Short description shown below the title in the UI. |
| `model` | string | `claude-haiku-4-5` | AI model to use. Valid values: `claude-haiku-4-5`, `claude-sonnet-4-6`, `claude-opus-4-6`. |
| `effort` | string | `low` | Thinking effort level: `low`, `medium`, or `high`. |
| `maxTokens` | integer | — | Maximum output tokens. Must be a positive integer. |
| `notification` | string | `notify` | Notification behavior when the workflow completes: `silent`, `notify`, or `push`. |

## Field Definitions

Each entry in `fields` defines one form input.

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `name` | string | yes | — | Unique identifier. Used as `{{name}}` placeholder in the body. |
| `label` | string | yes | — | Label shown above the input in the form. |
| `type` | string | no | `text` | Input type: `text`, `textarea`, `url`, or `select`. |
| `required` | boolean | no | `true` | Whether the field must be filled before submission. |
| `placeholder` | string | no | — | Placeholder/hint text shown in the empty input. |
| `options` | string[] | no | — | **Required when `type: select`.** List of dropdown options. |
| `default` | string | no | — | Pre-populated value. |

### Field Type Behavior

- **`text`** — Single-line text input.
- **`textarea`** — Multi-line text input. Supports @-mention file references from the Obsidian vault.
- **`url`** — Single-line input with URL validation.
- **`select`** — Dropdown menu. Must include a non-empty `options` array.

## Prompt Body

The markdown body below the frontmatter is the prompt sent to the AI. It must be non-empty.

### Placeholders

Use `{{fieldName}}` to inject form values. Every field defined in `fields` **must** have a corresponding `{{fieldName}}` placeholder in the body — the validator will reject the file otherwise.

If an optional field is left empty by the user, `{{fieldName}}` is replaced with `"not entered"`.

### Built-in Placeholders

These are available automatically (no field definition needed):

| Placeholder | Value |
|-------------|-------|
| `{{date}}` | Today's date in ISO format (e.g., `2026-03-20`) |
| `{{time}}` | Current time (e.g., `2:35 PM`) in the user's timezone |
| `{{dayOfWeek}}` | Current day of the week (e.g., `Thursday`) |
| `{{timezone}}` | The user's IANA timezone (e.g., `America/Toronto`) |
| `{{userName}}` | The user's display name |
| `{{aiMemoryPath}}` | Path to the AI memory folder in the Obsidian vault |

## Validation Rules

The system validates workflow files on save. A file must pass all rules to be usable:

1. `title` is a non-empty string.
2. `fields` is a non-empty array with unique `name` values.
3. Every field's `name` appears as `{{name}}` in the body.
4. `select` fields have a non-empty `options` array.
5. `model`, `effort`, and `notification` use valid enum values if present.
6. `maxTokens` is a positive integer if present.
7. The body is non-empty.

## Execution Context

When a workflow runs, the AI has access to:

- **Obsidian vault tools** — read, write, edit, search, list files and folders
- **Web tools** — search the web, fetch URLs
- **AI memory** — persistent notes about user preferences

The AI runs autonomously in the background (up to 10 agentic steps) and stores results as a chat thread. The user can view the full conversation or continue it in the chat interface.

## Example: Simple Workflow

```markdown
---
title: URL to Recipe
description: Convert a recipe URL into a formatted recipe file
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

Fetch the recipe at the following URL and convert it to a recipe markdown file in the recipes folder, following the recipe template.

URL: {{url}}

Additional instructions from the user:
{{instructions}}
```

## Example: Workflow with Select Field

```markdown
---
title: Research Summary
description: Research a topic and save a summary to the vault
model: claude-sonnet-4-6
effort: medium
maxTokens: 8192
notification: push
fields:
  - name: topic
    label: Research Topic
    type: text
    required: true
    placeholder: "e.g. Benefits of intermittent fasting"
  - name: depth
    label: Research Depth
    type: select
    required: true
    options:
      - Quick overview (1-2 paragraphs)
      - Standard summary (3-5 paragraphs)
      - Deep dive (comprehensive)
  - name: folder
    label: Save to Folder
    type: text
    required: false
    default: "research"
    placeholder: "Vault folder path..."
  - name: notes
    label: Additional Context
    type: textarea
    required: false
    placeholder: "Anything specific to focus on..."
---

Research the following topic and create a well-structured summary note in the `{{folder}}` folder.

**Topic:** {{topic}}

**Depth:** {{depth}}

**Additional context from user:**
{{notes}}

Use web search to find current, reliable information. Cite sources where possible. Format the note with clear headings and bullet points for scannability.
```

## Writing Tips

- **Be specific in the prompt body.** Tell the AI exactly what output format you want, where to save files, and what tools to use.
- **Use `effort: low` with `claude-haiku-4-5`** for simple tasks to keep costs down. Use higher effort and larger models for complex reasoning.
- **Mark fields as `required: false`** when they're genuinely optional. The placeholder should guide the user on what to enter.
- **Use `textarea` for open-ended input** where the user might write multiple lines or want to @-mention vault files.
- **Use `select` to constrain choices** when there's a known set of valid options.
- **Use `notification: push`** for long-running workflows where the user needs to know when it's done. Use `silent` for routine automated tasks.
- **Keep filenames descriptive and kebab-case** (e.g., `weekly-review.md`, `url-to-recipe.md`).
