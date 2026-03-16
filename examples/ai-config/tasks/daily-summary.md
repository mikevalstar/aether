---
title: Daily Summary
cron: "0 9 * * *"
model: claude-haiku-4-5
effort: low
enabled: true
---

Review my Obsidian vault for any notes modified in the last 24 hours. Create a brief daily summary note at `daily-summaries/{{date}}.md` that includes:

1. **Modified notes** — list each file that changed with a one-line summary of the change
2. **New notes** — list any newly created notes
3. **Open tasks** — scan for unchecked checkboxes (`- [ ]`) across recently modified files

Keep the summary concise and scannable. Use bullet points, not paragraphs.
