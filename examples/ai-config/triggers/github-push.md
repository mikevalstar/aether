---
title: Summarize GitHub Pushes
type: github
pattern: "ref == 'refs/heads/main'"
model: claude-haiku-4-5
effort: low
enabled: true
notification: notify
notificationLevel: info
notifyUsers:
  - all
pushMessage: false
---

A GitHub push event was received. Analyze the commit(s) and create a brief summary.

Event payload:

{{details}}

Please:

1. **Summarize** — one-line description of what changed overall
2. **Commits** — list each commit with author, message, and files changed
3. **Risk flags** — call out anything that looks risky (large diffs, config changes, dependency updates, deleted files)
4. **Action items** — note anything that might need follow-up (TODOs in commit messages, breaking changes, etc.)

Keep the summary concise. If there's nothing notable, say so briefly.
