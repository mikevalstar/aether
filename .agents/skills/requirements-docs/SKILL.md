---
name: requirements-docs
description: Write and maintain concise, living product requirements in `docs/requirements/` for this project. Use this whenever the user asks to write requirements, scope a feature, plan implementation, break work into features or sub-features, document what is done or in progress, or update requirement docs after coding. Prefer this even when the user says "plan", "spec", "roadmap", "document this feature", or "update the docs" rather than explicitly saying "requirements."
user-invokable: true
args:
  - name: target
    description: The feature or area to document (optional)
    required: false
---

Write and maintain project requirements as concise, information-dense living documents.

The source of truth for these docs is `docs/requirements/`.

## Goals

- Keep requirements easy for one developer to scan and keep current.
- Organize work by major feature, with separate files plus a top-level index.
- Make progress obvious with simple statuses: `todo`, `in-progress`, `done`.
- Support drill-down links from a major feature to sub-feature details when needed.
- Update requirement docs after implementation work so they stay useful.

## Required Structure

Use this layout unless the user asks for a different convention:

```text
docs/
  requirements/
    index.md
    <feature-name>.md
    <sub-feature-name>.md   # only when a sub-feature deserves its own doc
```

- `docs/requirements/index.md` is the overview.
- Each major feature gets its own file.
- Keep sub-features inline first. Split them into separate files only when the detail would make the parent hard to scan.

## Before Writing

Start by grounding yourself in the repo and current docs.

1. Check whether `docs/requirements/` already exists.
2. Read the relevant requirement files if they exist.
3. Inspect the code for current behavior.
4. Ask targeted questions before writing if the user has not explicitly given the feature's intent, constraints, status, or desired outcome.

## Clarify, Don't Invent

This skill should not make up the "why" behind a feature.

- You may infer current behavior from code.
- You may summarize implementation facts from code.
- Do not invent product rationale, priorities, or intent that are not stated by the user.
- If the reason a feature exists is unclear, ask.
- If success criteria are unclear, ask.
- If the current status is unclear, ask.

Good questions are short and specific. Ask only what is needed to write an accurate doc.

Examples:
- "What problem is this feature meant to solve for you?"
- "Should this be marked `done` or `in-progress` today?"
- "Do you want admin-only account creation called out as a deliberate product constraint or just current behavior?"

## Writing Rules

- Be concise and dense; these docs have an audience of one.
- Prefer bullets, compact tables, and short sections over long prose.
- Separate observed current behavior from intended future behavior.
- Preserve useful implementation constraints when they affect planning.
- Capture open questions explicitly instead of hiding uncertainty.
- Avoid filler like background paragraphs that do not help future decisions.

## Status Conventions

Use only these statuses:

- `todo`
- `in-progress`
- `done`

Reflect status in two places:

1. The top-level feature status in the feature doc.
2. The feature summary row in `docs/requirements/index.md`.

Sub-features should also have statuses, usually in a table.

## Templates

Use the bundled templates as the default starting point:

- Feature template: `templates/feature-requirement.md`
- Index template: `templates/requirements-index.md`

Adapt them when needed, but keep the same overall information model.

## Feature Document Workflow

When creating or updating a major feature doc:

1. Choose a stable, descriptive file name in kebab case.
2. Fill out the major feature template.
3. Add or update sub-features with statuses and brief notes.
4. Link to deeper sub-feature docs only when detail is large enough to justify another file.
5. Add an "Open Questions" section when intent or future direction is unresolved.
6. Add an "Update After Implementation" section only when it provides useful next maintenance cues; otherwise keep the doc tighter.

## Index Workflow

`docs/requirements/index.md` should stay extremely scannable.

Include:
- a short legend for statuses
- one row per major feature
- current status
- short summary
- link to the feature file
- last updated date

If you add or change a feature doc, update the index in the same task.

## After Coding Work

If the user implemented or changed a feature and asks to update docs:

1. Read the changed code and the existing requirement doc.
2. Update the feature doc to match the new reality.
3. Move completed items to `done`.
4. Mark actively partial work as `in-progress`.
5. Add newly discovered sub-features or follow-up work if they materially affect future planning.
6. Update `docs/requirements/index.md` so the overview stays accurate.

Do not leave the detailed doc and the index out of sync.

## Output Expectations

When you finish, briefly report:

- which requirement files were created or updated
- what status changed
- any open questions still captured in the docs

If you had to leave placeholders because the user did not answer something important, say so explicitly.

## Example Use Cases

Use this skill for prompts like:

- "Write requirements for the chat thread feature"
- "Plan the dashboard widgets work"
- "Document auth before I change it"
- "Update the requirements after finishing message editing"
- "Break this feature into major and sub-features"

Remember: the job is not to write grand product specs. The job is to create lean, durable working documents that help one developer decide what exists, what matters, what is next, and what changed.
