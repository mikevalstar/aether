# Debugging

The `pnpm debug` CLI consolidates the most common "what went wrong?" queries into one tool. It's the first stop for diagnosing Aether issues — faster than tailing logs, opening Prisma Studio, or pivoting between `/logs` and `/chat-debug` in the UI.

> Source: `scripts/debug.ts` (entry) + `src/lib/debug/` (helpers).
> Decision record: [ADR-004](./decisions/004-aether-debug-cli.md).

## Quick reference

```bash
pnpm debug doctor                  # smoke test: env, DB, dev server, vault, logs
pnpm debug logs errors             # error+ entries from today
pnpm debug logs tail --level info  # tail today's log (newest last)
pnpm debug tasks status            # all scheduled tasks + last run state
pnpm debug usage today             # token + cost rollup by model
pnpm debug --help                  # full help
```

All commands accept `--user <email>` to scope to a specific user (defaults to "all users" or, where required, the first admin). Most also accept `--json` for machine-readable output.

> **Cost tip — when testing AI features, use the cheapest model that meets the need.** Run `pnpm debug models` to see the price-sorted list. Most agent loops, tool-use flows, and prompt-shape changes behave identically across models, so default to Haiku 4.5 or Kimi K2.5 unless you specifically need Sonnet/Opus quality. Override per-call via the `model:` frontmatter on a task/workflow/trigger, or the model picker in chat.

## Commands

### `doctor`

Single command that checks:

| Check               | What it verifies                                                    |
| ------------------- | ------------------------------------------------------------------- |
| Dev server          | TCP listener on `:3000` (warn if down — not fatal)                  |
| Database            | Prisma can `SELECT count()` from User (critical)                    |
| `ANTHROPIC_API_KEY` | Required for chat (critical)                                        |
| Optional API keys   | `OPENROUTER_API_KEY`, `MINIMAX_API_KEY`, `EXA_API_KEY` (warn only)  |
| Obsidian vault      | `OBSIDIAN_DIR` is set and the directory is readable                 |
| Log directory       | `logs/` exists and contains today's `aether.YYYY-MM-DD.N.log`       |
| Last activity       | Most recent `ActivityLog` row exists (warn if older than 7 days)    |
| Admin user          | At least one user with `role = "admin"` exists (critical)           |

Exits with status 1 if any **critical** check fails — safe to use in scripts and pre-commit hooks.

```bash
pnpm debug doctor
pnpm debug doctor --json | jq '.[] | select(.status != "ok")'
```

### `logs <subcommand>`

NDJSON-aware reader for the rotated pino log files (`logs/aether.YYYY-MM-DD.N.log`).

```bash
# Tail the most recent log file
pnpm debug logs tail                       # default level: warn, last 50 entries
pnpm debug logs tail --level info --lines 200
pnpm debug logs tail --grep "task-scheduler"

# Just errors from today (or last N days)
pnpm debug logs errors
pnpm debug logs errors --days 7

# Multi-day grep
pnpm debug logs search "Trigger failed" --days 14
pnpm debug logs search "userId.*abc123" --days 7
```

Levels follow pino: `trace` < `debug` < `info` < `warn` < `error` < `fatal`. Filter expressions are case-insensitive JavaScript regular expressions matched against the full JSON line.

### `tasks <subcommand>`

```bash
pnpm debug tasks status              # all scheduled tasks + last run + thread id
pnpm debug tasks status --json
pnpm debug tasks run my-task.md      # invoke executeTask() directly (one-shot)
```

`tasks run` reuses the same `executeTask` path the scheduler uses. The task's last-run row will be updated, a new `ChatThread` will be created, and any notifications will fire — exactly as if cron triggered it.

### `workflows <subcommand>`

```bash
pnpm debug workflows status
pnpm debug workflows status --json
```

### `triggers <subcommand>`

```bash
pnpm debug triggers status
pnpm debug triggers fire github.md --payload '{"action":"opened","number":42}'
pnpm debug triggers fire imap.md --payload "$(cat sample.json)"
pnpm debug triggers fire something.md --user alice@example.com   # run as alice
```

`triggers fire` reuses the same `executeTrigger` path the dispatcher uses. The payload string is parsed as JSON and substituted into the trigger body's `{{details}}` placeholder.

### `chat <subcommand>`

```bash
pnpm debug chat threads                       # 20 most recent threads (all users)
pnpm debug chat threads --user mike@valstar.dev --limit 50
pnpm debug chat thread cmh1234abc             # full message history + usage
pnpm debug chat thread cmh1234abc --json
```

### `usage today|week|month`

Aggregates `ChatUsageEvent` rows by `(model, taskType)` with cost rollups.

```bash
pnpm debug usage today
pnpm debug usage week
pnpm debug usage month --user mike@valstar.dev --json | jq 'map(.estimatedCostUsd) | add'
```

The result table is sorted by cost descending and includes a footer with the total token count and total USD cost.

### `activity tail`

Most recent `ActivityLog` rows, joined to `FileChangeDetail`:

```bash
pnpm debug activity tail
pnpm debug activity tail --type file_change --limit 100
pnpm debug activity tail --user mike@valstar.dev
```

### `notifications`

```bash
pnpm debug notifications                # 50 most recent (all levels, read+unread)
pnpm debug notifications --unread
pnpm debug notifications --level error --limit 200
```

### `models`

Print the configured chat models sorted cheapest first (using `inputCost + outputCost/4` as a rough effective rate, which assumes a 4:1 input/output token ratio typical of agent loops).

```bash
pnpm debug models                # price-sorted table with default flagged
pnpm debug models --json
```

When testing, default to whichever model is at the top of this list unless you specifically need higher-quality reasoning.

### `users`

List every user with role, ban status, email-verified flag, enabled plugins (parsed from the `User.preferences` JSON), and their default chat model + timezone.

```bash
pnpm debug users
pnpm debug users --json | jq '.[] | select(.role == "admin")'
pnpm debug users --json | jq '[.[] | .enabledPlugins[]] | unique'
```

Useful for sanity-checking that a user has the plugin enabled they think they do, or for finding which users have which models pinned as their default.

### `config`

Dumps the same payload as the `/chat-debug` route — models, tools, skills, sub-agents, plugins, and effective config. Uses the first admin user for plugin enablement.

```bash
pnpm debug config                       # pretty tables
pnpm debug config --json                # full ChatDebugData JSON
pnpm debug config --json | jq '.tools | length'
pnpm debug config --json | jq '.plugins[] | select(.enabled)'
```

## Underlying log files

The CLI is built on top of these files; if the CLI itself is broken, you can fall back to the manual recipes below.

| Path                                  | Format       | Rotation     | What's in it                                                  |
| ------------------------------------- | ------------ | ------------ | ------------------------------------------------------------- |
| `logs/aether.YYYY-MM-DD.N.log`        | NDJSON (pino) | daily        | Server-side application logs (task scheduler, executor, etc.) |
| `logs/vite.log`                       | plain text   | per-run      | Vite dev server, HMR, compile warnings                        |

### Manual fallback

```bash
tail -50 logs/aether.$(date +%Y-%m-%d).1.log | jq .msg
tail -50 logs/aether.$(date +%Y-%m-%d).1.log | jq 'select(.level >= 40)'
tail -50 logs/vite.log
```

## When to reach for the CLI vs. the UI

| You want to…                                       | Use                                  |
| -------------------------------------------------- | ------------------------------------ |
| Confirm the dev environment is healthy             | `pnpm debug doctor`                  |
| See errors since the last deploy                   | `pnpm debug logs errors --days 7`    |
| Find why a specific task didn't run last night     | `pnpm debug tasks status` + `logs search` |
| Manually retry a flaky trigger with a real payload | `pnpm debug triggers fire …`         |
| Check what a chat thread sent to Anthropic         | `pnpm debug chat thread <id>`        |
| Estimate this week's token spend                   | `pnpm debug usage week`              |
| Rich, interactive log filtering with sparkline     | `/logs` route in the running app     |
| Visual model + tool reference                      | `/chat-debug` route (or `pnpm debug config`) |
| Confirm a user has a plugin enabled                | `pnpm debug users`                   |

## Adding a new subcommand

1. Add a query helper to `src/lib/debug/queries.ts` (or a focused module).
2. Wire it up in `scripts/debug.ts` by adding a `cmdFoo()` handler and a switch case.
3. Update the `HELP` constant at the top of `scripts/debug.ts`.
4. Document it in this file.

Keep handlers small — they're glue. All real logic lives in `src/lib/debug/`.
