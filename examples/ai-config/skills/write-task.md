---
name: Writing Tasks
description: Use this skill when the user asks to create, modify, or schedule a periodic/recurring task. You can use this to check things in the future if the user asks
tags:
  - task
  - scheduling
priority: 5
---
# Writing an Aether Task File

You are writing a task file for Aether, a personal dashboard app. Tasks are markdown files with YAML frontmatter that define scheduled AI jobs. They run automatically on a cron schedule in the background with access to tools (Obsidian vault, web search, file operations).

## File Format

Task files are markdown (`.md`) with YAML frontmatter. They live in the AI config directory under `tasks/`.

```markdown
---
title: Task Name
cron: "0 9 * * *"
model: minimax/minimax-m2.7
effort: low
enabled: true
---

Prompt body goes here. Use {{date}}, {{userName}}, or {{aiMemoryPath}} placeholders.
```

## Frontmatter Reference

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Display name for the task. Must be non-empty. |
| `cron` | string | Standard 5-field cron expression (`min hour dom mon dow`). Must be quoted in YAML. |

### Optional Fields

| Field          | Type    | Default                | Description                                                                                                        |
| -------------- | ------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `model`        | string  | `minimax/minimax-m2.7` | AI model to use. Valid values: `minimax/minimax-m2.7`, `claude-haiku-4-5`, `claude-sonnet-4-6`, `claude-opus-4-6`. |
| `effort`       | string  | `low`                  | Thinking effort level: `low`, `medium`, or `high`.                                                                 |
| `enabled`      | boolean | `true`                 | Set to `false` to pause the task without deleting it.                                                              |
| `endDate`      | string  | —                      | ISO 8601 date (e.g., `2026-12-31`). Task stops running after this date.                                            |
| `maxTokens`    | integer | —                      | Maximum output tokens. Positive integer. Limits response length and cost.                                          |
| `timezone`     | string  | server timezone        | IANA timezone (e.g., `America/Toronto`). Controls when the cron fires.                                             |
| `notification` | string  | `notify`               | Notification when task completes: `silent`, `notify`, or `push`.                                                   |

## Cron Expression Reference

Standard 5-field format: `minute hour day-of-month month day-of-week`

| Expression | Schedule |
|-----------|----------|
| `0 9 * * *` | Daily at 9:00 AM |
| `0 9 * * 1-5` | Weekdays at 9:00 AM |
| `30 8 * * 1` | Mondays at 8:30 AM |
| `0 */6 * * *` | Every 6 hours |
| `0 9 1 * *` | First day of each month at 9:00 AM |
| `*/30 * * * *` | Every 30 minutes |

**Important:** Always quote cron expressions in YAML (e.g., `cron: "0 9 * * *"`).

## Prompt Body

The markdown body below the frontmatter is the prompt sent to the AI when the task runs. It must be non-empty.

### Built-in Placeholders

These are substituted automatically at execution time:

| Placeholder | Value |
|-------------|-------|
| `{{date}}` | Today's date in ISO format (e.g., `2026-03-20`) |
| `{{time}}` | Current time (e.g., `2:35 PM`) in the user's timezone |
| `{{dayOfWeek}}` | Current day of the week (e.g., `Thursday`) |
| `{{timezone}}` | The user's IANA timezone (e.g., `America/Toronto`) |
| `{{userName}}` | The user's display name |
| `{{aiMemoryPath}}` | Path to the AI memory folder in the Obsidian vault |

### What to Include in the Prompt

- **Clear objective** — What should the AI accomplish each time this runs?
- **Output location** — Where should results be saved? (e.g., a specific vault folder)
- **Format expectations** — What should the output look like? (bullet points, headings, etc.)
- **Scope boundaries** — What should the AI focus on or ignore?

## Execution Context

When a task runs, the AI has access to:

- **Obsidian vault tools** — read, write, edit, search, list files and folders
- **Web tools** — search the web, fetch URLs
- **AI memory** — persistent notes about user preferences

The AI runs autonomously in the background (up to 10 agentic steps) and stores results as a chat thread. The user can view the full conversation or continue it in the chat interface.

Tasks always run as the admin user. If the server was down during a scheduled time, the missed run is **not** retroactively executed — it resumes from the next scheduled time.

## Validation Rules

The system validates task files automatically. A file must pass all rules to be loaded:

1. `title` is a non-empty string.
2. `cron` is a valid 5-field cron expression.
3. `model` is a valid model ID (if present).
4. `effort` is one of `low`, `medium`, `high` (if present).
5. `notification` is one of `silent`, `notify`, `push` (if present).
6. `endDate` is a valid ISO 8601 date (if present).
7. `timezone` is a valid IANA timezone (if present).
8. `maxTokens` is a positive integer (if present).
9. The body is non-empty.

Invalid tasks are excluded from scheduling and logged as warnings.

## Example: Simple Daily Task

```markdown
---
title: Daily Summary
cron: "0 9 * * *"
model: claude-haiku-4-5
effort: low
---

Review my Obsidian vault for any notes modified in the last 24 hours. Create a brief daily summary note at `daily-summaries/{{date}}.md` that includes:

1. **Modified notes** — list each file that changed with a one-line summary of the change
2. **New notes** — list any newly created notes
3. **Open tasks** — scan for unchecked checkboxes (`- [ ]`) across recently modified files

Keep the summary concise and scannable. Use bullet points, not paragraphs.
```

## Example: Weekly Task with Options

```markdown
---
title: Weekly Review
cron: "0 10 * * 0"
model: claude-sonnet-4-6
effort: medium
timezone: America/Toronto
notification: push
maxTokens: 8192
---

Generate a weekly review of my Obsidian vault covering the past 7 days. Save it to `reviews/weekly/{{date}}.md`.

## Sections to Include

1. **Accomplishments** — Notes created or significantly modified
2. **Open Items** — Unchecked tasks (`- [ ]`) found across the vault
3. **Patterns** — Any recurring themes or topics from the week
4. **Upcoming** — Check for any notes mentioning future dates in the next 7 days

## Guidelines

- Focus on what changed, not exhaustive listings
- Group related items together
- Keep the tone neutral and factual
```

## Example: Task with End Date

```markdown
---
title: Advent Calendar Reminder
cron: "0 8 * * *"
model: claude-haiku-4-5
effort: low
enabled: true
endDate: "2026-12-25"
notification: push
---

Check my Obsidian vault for an advent calendar tracker. Remind me which day we're on and suggest today's activity if one is listed.
```

## Writing Tips

- **Use `claude-haiku-4-5` with `effort: low`** for simple, routine tasks to keep costs minimal.
- **Use `notification: push`** for important tasks where you need to know the result. Use `silent` for routine tasks that just write files.
- **Set a `timezone`** if the schedule is time-sensitive (e.g., morning summary should match your local morning).
- **Set `enabled: false`** to pause a task temporarily without deleting it.
- **Use `endDate`** for seasonal or time-limited tasks.
- **Use `maxTokens`** to cap costs on tasks that might produce unexpectedly long output.
- **Keep filenames descriptive and kebab-case** (e.g., `daily-summary.md`, `weekly-review.md`).
- **Be specific in the prompt** — the AI runs unattended, so vague instructions produce inconsistent results.
