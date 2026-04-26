#!/usr/bin/env tsx
/**
 * `pnpm debug <subcommand>` — diagnostic CLI for Aether.
 *
 * Consolidates the most common "what went wrong?" queries into one tool:
 *   - logs tail/errors/search       inspect rotated NDJSON logs
 *   - tasks status / run            inspect & manually fire scheduled tasks
 *   - workflows status              inspect saved workflows
 *   - triggers status / fire        inspect & manually fire event triggers
 *   - chat threads / thread <id>    inspect chat threads
 *   - usage today|week|month        roll up token cost by model + task type
 *   - activity tail                 recent ActivityLog entries
 *   - notifications                 Notification inbox
 *   - doctor                        environment & connectivity smoke test
 *   - config                        dump effective AI config (mirrors /chat-debug)
 *
 * Pass `--json` to most subcommands for machine-readable output.
 *
 * See docs/debugging.md for the full reference.
 */

import "dotenv/config";

import { prisma } from "../src/db";
import { buildChatDebugData } from "../src/lib/debug/chat-debug-data";
import { runDoctorChecks } from "../src/lib/debug/doctor";
import { c, fmtInt, fmtUsd, heading, maybeJson, relativeTime, renderTable } from "../src/lib/debug/format";
import { collectLogEntries, getRecentDayFiles, type LogLevel, printEntry } from "../src/lib/debug/logs";
import {
  aggregateUsage,
  getChatThread,
  getFirstAdminUser,
  getUserByEmail,
  listActivity,
  listChatThreads,
  listNotifications,
  listTasks,
  listTriggers,
  listUsersWithPlugins,
  listWorkflows,
  type UsageWindow,
} from "../src/lib/debug/queries";

type ArgMap = {
  positional: string[];
  flags: Record<string, string | boolean>;
};

/** Tiny argv parser: supports --flag, --flag=value, --flag value, and positional args. */
function parseArgs(argv: string[]): ArgMap {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const eqIdx = arg.indexOf("=");
      if (eqIdx > -1) {
        flags[arg.slice(2, eqIdx)] = arg.slice(eqIdx + 1);
      } else {
        const key = arg.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith("--")) {
          flags[key] = next;
          i += 1;
        } else {
          flags[key] = true;
        }
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function flagBool(args: ArgMap, name: string): boolean {
  const v = args.flags[name];
  return v === true || v === "true";
}
function flagStr(args: ArgMap, name: string): string | undefined {
  const v = args.flags[name];
  return typeof v === "string" ? v : undefined;
}
function flagNum(args: ArgMap, name: string): number | undefined {
  const v = args.flags[name];
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

const HELP = `aether debug — diagnostic CLI

Usage: pnpm debug <command> [options]

Logs:
  logs tail [--level info] [--grep <regex>] [--lines 50]
                       Tail today's logs (newest last). Default level: warn.
  logs errors [--days 1]
                       Show error+ entries across the last N days.
  logs search <regex> [--days 7]
                       Grep multi-day rotated logs.

Tasks / workflows / triggers:
  tasks status [--json]
  tasks run <filename>
  workflows status [--json]
  triggers status [--json]
  triggers fire <filename> [--payload '{...}'] [--user <email>]

Chat / usage:
  chat threads [--user <email>] [--limit 20] [--json]
  chat thread <id>
  usage today|week|month [--user <email>] [--json]

Activity / notifications:
  activity tail [--type <t>] [--limit 50] [--json]
  notifications [--unread] [--level error] [--limit 50] [--json]

System:
  doctor               Run environment + connectivity smoke test.
  config [--json]      Dump effective AI config (models, tools, skills, plugins).
  models [--json]      List chat models sorted by price (cheapest first).
  users [--json]       List all users with role + enabled plugins.

Tip: when testing AI features, prefer the cheapest model that meets your needs
(see "pnpm debug models"). Most agent loops behave the same regardless of model
quality, so use Haiku 4.5 or Kimi K2.5 unless you specifically need Sonnet/Opus
behaviour.

Global flags:
  --user <email>       Scope queries to a specific user (default: first admin).
  --json               Emit raw JSON instead of formatted tables.
`;

async function resolveUserId(args: ArgMap): Promise<string | undefined> {
  const email = flagStr(args, "user");
  if (email) {
    const user = await getUserByEmail(email);
    if (!user) {
      console.error(c.red(`Unknown user: ${email}`));
      process.exit(2);
    }
    return user.id;
  }
  return undefined;
}

async function defaultAdminUserId(): Promise<string> {
  const admin = await getFirstAdminUser();
  if (!admin) {
    console.error(c.red("No admin user found. Run `pnpm create:first-admin` first."));
    process.exit(2);
  }
  return admin.id;
}

// ── Subcommand handlers ──────────────────────────────────────────────────

async function cmdLogs(args: ArgMap) {
  const sub = args.positional.shift();
  if (!sub) {
    console.error("logs subcommand required: tail | errors | search");
    process.exit(1);
  }

  if (sub === "tail") {
    const level = (flagStr(args, "level") ?? "warn") as LogLevel;
    const grep = flagStr(args, "grep");
    const lines = flagNum(args, "lines") ?? 50;
    const days = await getRecentDayFiles(1);
    if (days.length === 0) {
      console.log(c.dim("(no log files found)"));
      return;
    }
    const entries = await collectLogEntries({
      files: days[0].files,
      minLevel: level,
      grep: grep ? new RegExp(grep, "i") : undefined,
    });
    const slice = entries.slice(-lines);
    for (const entry of slice) printEntry(entry);
    return;
  }

  if (sub === "errors") {
    const days = flagNum(args, "days") ?? 1;
    const dayFiles = await getRecentDayFiles(days);
    let count = 0;
    for (const { day, files } of dayFiles) {
      const entries = await collectLogEntries({ files, minLevel: "error" });
      if (entries.length === 0) continue;
      console.log(heading(`${day} — ${entries.length} error${entries.length === 1 ? "" : "s"}`));
      for (const entry of entries) {
        printEntry(entry, { showSource: true });
        count += 1;
      }
    }
    if (count === 0) console.log(c.green("No errors in the requested window."));
    return;
  }

  if (sub === "search") {
    const pattern = args.positional.shift();
    if (!pattern) {
      console.error("logs search <regex> required");
      process.exit(1);
    }
    const days = flagNum(args, "days") ?? 7;
    const dayFiles = await getRecentDayFiles(days);
    let total = 0;
    for (const { day, files } of dayFiles) {
      const entries = await collectLogEntries({ files, grep: new RegExp(pattern, "i") });
      if (entries.length === 0) continue;
      console.log(heading(`${day} — ${entries.length} match${entries.length === 1 ? "" : "es"}`));
      for (const entry of entries) printEntry(entry, { showSource: true });
      total += entries.length;
    }
    if (total === 0) console.log(c.dim("(no matches)"));
    return;
  }

  console.error(`Unknown logs subcommand: ${sub}`);
  process.exit(1);
}

async function cmdTasks(args: ArgMap) {
  const sub = args.positional.shift();
  if (!sub || sub === "status") {
    const userId = await resolveUserId(args);
    const tasks = await listTasks({ userId });
    if (maybeJson(tasks, flagBool(args, "json"))) return;
    console.log(
      renderTable(tasks, [
        { header: "Filename", get: (t) => t.filename, maxWidth: 36 },
        { header: "Title", get: (t) => t.title, maxWidth: 30 },
        { header: "Cron", get: (t) => t.cron, maxWidth: 16 },
        { header: "Enabled", get: (t) => (t.enabled ? c.green("yes") : c.dim("no")) },
        { header: "Last run", get: (t) => relativeTime(t.lastRunAt) },
        { header: "Status", get: (t) => statusColor(t.lastRunStatus) },
        { header: "Thread", get: (t) => t.lastThreadId ?? c.dim("—"), maxWidth: 24 },
      ]),
    );
    return;
  }

  if (sub === "run") {
    const filename = args.positional.shift();
    if (!filename) {
      console.error("tasks run <filename> required");
      process.exit(1);
    }
    // Lazy-import so the heavy executor chain only loads when actually invoking.
    const { parseTaskFile, getTasksDir } = await import("../src/lib/tasks/task-loader");
    const { executeTask } = await import("../src/lib/tasks/task-executor");
    const path = await import("node:path");
    const tasksDir = getTasksDir();
    if (!tasksDir) {
      console.error(c.red("No AI config dir configured (set OBSIDIAN_DIR + OBSIDIAN_AI_CONFIG)."));
      process.exit(2);
    }
    const filePath = path.join(tasksDir, filename);
    const config = await parseTaskFile(filePath);
    if (!config) {
      console.error(c.red(`Failed to parse task: ${filePath}`));
      process.exit(2);
    }
    console.log(c.cyan(`▸ Running task: ${filename}`));
    await executeTask(filename, config);
    console.log(c.green("✓ Task complete"));
    return;
  }

  console.error(`Unknown tasks subcommand: ${sub}`);
  process.exit(1);
}

async function cmdWorkflows(args: ArgMap) {
  const sub = args.positional.shift() ?? "status";
  if (sub !== "status") {
    console.error(`Unknown workflows subcommand: ${sub}`);
    process.exit(1);
  }
  const userId = await resolveUserId(args);
  const workflows = await listWorkflows({ userId });
  if (maybeJson(workflows, flagBool(args, "json"))) return;
  console.log(
    renderTable(workflows, [
      { header: "Filename", get: (w) => w.filename, maxWidth: 36 },
      { header: "Title", get: (w) => w.title, maxWidth: 36 },
      { header: "Last run", get: (w) => relativeTime(w.lastRunAt) },
      { header: "Status", get: (w) => statusColor(w.lastRunStatus) },
      { header: "Thread", get: (w) => w.lastThreadId ?? c.dim("—"), maxWidth: 24 },
    ]),
  );
}

async function cmdTriggers(args: ArgMap) {
  const sub = args.positional.shift();
  if (!sub || sub === "status") {
    const userId = await resolveUserId(args);
    const triggers = await listTriggers({ userId });
    if (maybeJson(triggers, flagBool(args, "json"))) return;
    console.log(
      renderTable(triggers, [
        { header: "Filename", get: (t) => t.filename, maxWidth: 32 },
        { header: "Title", get: (t) => t.title, maxWidth: 28 },
        { header: "Type", get: (t) => t.type, maxWidth: 24 },
        { header: "Enabled", get: (t) => (t.enabled ? c.green("yes") : c.dim("no")) },
        { header: "Last fired", get: (t) => relativeTime(t.lastFiredAt) },
        { header: "Status", get: (t) => statusColor(t.lastRunStatus) },
      ]),
    );
    return;
  }

  if (sub === "fire") {
    const filename = args.positional.shift();
    if (!filename) {
      console.error("triggers fire <filename> required");
      process.exit(1);
    }
    const payloadStr = flagStr(args, "payload") ?? "{}";
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(payloadStr);
    } catch (err) {
      console.error(c.red(`Invalid --payload JSON: ${err instanceof Error ? err.message : err}`));
      process.exit(1);
    }
    const { parseTriggerFile, getTriggersDir } = await import("../src/lib/triggers/trigger-watcher");
    const { executeTrigger } = await import("../src/lib/triggers/trigger-executor");
    const path = await import("node:path");
    const triggersDir = getTriggersDir();
    if (!triggersDir) {
      console.error(c.red("No AI config dir configured."));
      process.exit(2);
    }
    const filePath = path.join(triggersDir, filename);
    const config = await parseTriggerFile(filePath);
    if (!config) {
      console.error(c.red(`Failed to parse trigger: ${filePath}`));
      process.exit(2);
    }
    const userIdOverride = await resolveUserId(args);
    console.log(c.cyan(`▸ Firing trigger: ${filename}`));
    await executeTrigger(filename, config, payload, userIdOverride);
    console.log(c.green("✓ Trigger complete"));
    return;
  }

  console.error(`Unknown triggers subcommand: ${sub}`);
  process.exit(1);
}

async function cmdChat(args: ArgMap) {
  const sub = args.positional.shift();
  if (!sub) {
    console.error("chat subcommand required: threads | thread <id>");
    process.exit(1);
  }

  if (sub === "threads") {
    const userId = await resolveUserId(args);
    const limit = flagNum(args, "limit") ?? 20;
    const threads = await listChatThreads({ userId, limit });
    if (maybeJson(threads, flagBool(args, "json"))) return;
    console.log(
      renderTable(threads, [
        { header: "ID", get: (t) => t.id, maxWidth: 24 },
        { header: "Title", get: (t) => t.title, maxWidth: 40 },
        { header: "Type", get: (t) => t.type, maxWidth: 12 },
        { header: "Model", get: (t) => t.model, maxWidth: 24 },
        { header: "In", get: (t) => fmtInt(t.totalInputTokens), align: "right" },
        { header: "Out", get: (t) => fmtInt(t.totalOutputTokens), align: "right" },
        { header: "Cost", get: (t) => fmtUsd(t.totalEstimatedCostUsd), align: "right" },
        { header: "Updated", get: (t) => relativeTime(t.updatedAt) },
      ]),
    );
    return;
  }

  if (sub === "thread") {
    const id = args.positional.shift();
    if (!id) {
      console.error("chat thread <id> required");
      process.exit(1);
    }
    const thread = await getChatThread(id);
    if (!thread) {
      console.error(c.red(`Thread not found: ${id}`));
      process.exit(2);
    }
    if (maybeJson(thread, flagBool(args, "json"))) return;
    console.log(heading(`Thread: ${thread.title}`));
    console.log(`${c.dim("id:     ")}${thread.id}`);
    console.log(`${c.dim("type:   ")}${thread.type}`);
    console.log(`${c.dim("model:  ")}${thread.model}  (effort: ${thread.effort})`);
    console.log(`${c.dim("user:   ")}${thread.userId}`);
    console.log(`${c.dim("tokens: ")}in=${fmtInt(thread.totalInputTokens)}  out=${fmtInt(thread.totalOutputTokens)}  cost=${fmtUsd(thread.totalEstimatedCostUsd)}`);
    if (thread.sourceTaskFile) console.log(`${c.dim("task:   ")}${thread.sourceTaskFile}`);
    if (thread.sourceWorkflowFile) console.log(`${c.dim("flow:   ")}${thread.sourceWorkflowFile}`);
    if (thread.sourceTriggerFile) console.log(`${c.dim("trig:   ")}${thread.sourceTriggerFile}`);

    let messages: unknown;
    try {
      messages = JSON.parse(thread.messagesJson);
    } catch {
      messages = thread.messagesJson;
    }
    console.log(heading("Messages"));
    if (Array.isArray(messages)) {
      for (const m of messages as Array<Record<string, unknown>>) {
        const role = String(m.role ?? "?");
        const roleColor = role === "user" ? c.cyan : role === "assistant" ? c.green : c.dim;
        const text = extractMessageText(m);
        console.log(`${roleColor(`[${role}]`)} ${text}`);
      }
    } else {
      console.log(thread.messagesJson);
    }
    return;
  }

  console.error(`Unknown chat subcommand: ${sub}`);
  process.exit(1);
}

function extractMessageText(m: Record<string, unknown>): string {
  if (typeof m.content === "string") return m.content;
  if (Array.isArray(m.content)) {
    return (m.content as Array<Record<string, unknown>>)
      .map((part) => {
        if (typeof part.text === "string") return part.text;
        if (part.type === "tool-call" || part.type === "tool-use") return c.magenta(`<tool-call ${String(part.toolName ?? part.name ?? "?")}>`);
        if (part.type === "tool-result") return c.magenta(`<tool-result>`);
        return c.dim(`<${String(part.type ?? "part")}>`);
      })
      .join(" ");
  }
  if (Array.isArray(m.parts)) {
    return (m.parts as Array<Record<string, unknown>>).map((p) => (typeof p.text === "string" ? p.text : c.dim(`<${String(p.type)}>`))).join(" ");
  }
  return c.dim("(no text)");
}

async function cmdUsage(args: ArgMap) {
  const window = (args.positional.shift() ?? "today") as UsageWindow;
  if (!["today", "week", "month"].includes(window)) {
    console.error(`Invalid window: ${window} (expected today|week|month)`);
    process.exit(1);
  }
  const userId = await resolveUserId(args);
  const rows = await aggregateUsage(window, userId);
  if (maybeJson(rows, flagBool(args, "json"))) return;
  console.log(heading(`Usage — ${window}${userId ? ` (user ${userId})` : " (all users)"}`));
  console.log(
    renderTable(rows, [
      { header: "Model", get: (r) => r.model, maxWidth: 28 },
      { header: "Type", get: (r) => r.taskType },
      { header: "Events", get: (r) => fmtInt(r.events), align: "right" },
      { header: "Input", get: (r) => fmtInt(r.inputTokens), align: "right" },
      { header: "Output", get: (r) => fmtInt(r.outputTokens), align: "right" },
      { header: "Total", get: (r) => fmtInt(r.totalTokens), align: "right" },
      { header: "Cost", get: (r) => fmtUsd(r.estimatedCostUsd), align: "right" },
    ]),
  );
  const totalCost = rows.reduce((s, r) => s + r.estimatedCostUsd, 0);
  const totalTokens = rows.reduce((s, r) => s + r.totalTokens, 0);
  console.log(c.dim(`\n${rows.length} model/type combos · ${fmtInt(totalTokens)} tokens · ${fmtUsd(totalCost)} total`));
}

async function cmdActivity(args: ArgMap) {
  const sub = args.positional.shift() ?? "tail";
  if (sub !== "tail") {
    console.error(`Unknown activity subcommand: ${sub}`);
    process.exit(1);
  }
  const userId = await resolveUserId(args);
  const type = flagStr(args, "type");
  const limit = flagNum(args, "limit") ?? 50;
  const entries = await listActivity({ userId, type, limit });
  if (maybeJson(entries, flagBool(args, "json"))) return;
  console.log(
    renderTable(entries, [
      { header: "When", get: (a) => relativeTime(a.createdAt) },
      { header: "Type", get: (a) => a.type, maxWidth: 24 },
      { header: "Summary", get: (a) => a.summary, maxWidth: 60 },
      {
        header: "File",
        get: (a) => (a.fileChangeDetail ? `${a.fileChangeDetail.changeSource}:${a.fileChangeDetail.filePath}` : c.dim("—")),
        maxWidth: 60,
      },
    ]),
  );
}

async function cmdNotifications(args: ArgMap) {
  const userId = await resolveUserId(args);
  const items = await listNotifications({
    userId,
    unread: flagBool(args, "unread"),
    level: flagStr(args, "level"),
    limit: flagNum(args, "limit") ?? 50,
  });
  if (maybeJson(items, flagBool(args, "json"))) return;
  console.log(
    renderTable(items, [
      { header: "When", get: (n) => relativeTime(n.createdAt) },
      { header: "Level", get: (n) => levelTag(n.level) },
      { header: "Read", get: (n) => (n.read ? c.dim("✓") : c.yellow("●")) },
      { header: "Title", get: (n) => n.title, maxWidth: 50 },
      { header: "Body", get: (n) => n.body ?? "", maxWidth: 70 },
    ]),
  );
}

async function cmdDoctor(args: ArgMap) {
  const results = await runDoctorChecks();
  if (maybeJson(results, flagBool(args, "json"))) {
    process.exit(results.some((r) => r.critical && r.status === "fail") ? 1 : 0);
  }
  console.log(heading("Doctor"));
  console.log(
    renderTable(results, [
      {
        header: "Status",
        get: (r) => (r.status === "ok" ? c.green("✓ ok") : r.status === "warn" ? c.yellow("⚠ warn") : c.red("✗ fail")),
      },
      { header: "Check", get: (r) => r.name, maxWidth: 24 },
      { header: "Detail", get: (r) => r.detail, maxWidth: 70 },
    ]),
  );
  const failed = results.filter((r) => r.critical && r.status === "fail");
  if (failed.length > 0) {
    console.error(c.red(`\n${failed.length} critical check(s) failed.`));
    process.exit(1);
  }
}

async function cmdConfig(args: ArgMap) {
  const userId = await defaultAdminUserId();
  const data = await buildChatDebugData(userId);
  if (maybeJson(data, flagBool(args, "json"))) return;

  console.log(heading("Configuration"));
  for (const [k, v] of Object.entries(data.config)) {
    const value = typeof v === "boolean" ? (v ? c.green("yes") : c.red("no")) : String(v);
    console.log(`  ${c.dim(k.padEnd(22))}${value}`);
  }

  console.log(heading(`Models (${data.models.length})`));
  console.log(
    renderTable(data.models, [
      { header: "ID", get: (m) => m.id, maxWidth: 36 },
      { header: "Provider", get: (m) => m.provider },
      { header: "In $/M", get: (m) => `$${m.pricing.inputCostPerMillionTokensUsd}`, align: "right" },
      { header: "Out $/M", get: (m) => `$${m.pricing.outputCostPerMillionTokensUsd}`, align: "right" },
      { header: "Web", get: (m) => m.webToolVersion },
      { header: "Effort", get: (m) => (m.supportsEffort ? "yes" : "no") },
      { header: "Default", get: (m) => (m.id === data.userDefaultModel ? c.green("user") : m.isDefault ? c.dim("system") : "") },
    ]),
  );

  console.log(heading(`Tools (${data.tools.length})`));
  console.log(
    renderTable(data.tools, [
      { header: "Name", get: (t) => t.name, maxWidth: 36 },
      { header: "Category", get: (t) => t.category, maxWidth: 22 },
      { header: "Params", get: (t) => (t.isProviderTool ? c.dim("provider") : String(t.parameters.length)) },
      { header: "Conditional", get: (t) => t.conditional ?? "", maxWidth: 50 },
    ]),
  );

  console.log(heading(`Skills (${data.skills.length})`));
  console.log(
    renderTable(data.skills, [
      { header: "Filename", get: (s) => s.filename, maxWidth: 28 },
      { header: "Name", get: (s) => s.name, maxWidth: 24 },
      { header: "Priority", get: (s) => String(s.priority ?? 0), align: "right" },
      { header: "Description", get: (s) => s.description, maxWidth: 70 },
    ]),
  );

  console.log(heading(`Sub-agents (${data.subAgents.length})`));
  console.log(
    renderTable(data.subAgents, [
      { header: "Filename", get: (s) => s.filename, maxWidth: 28 },
      { header: "Name", get: (s) => s.name, maxWidth: 24 },
      { header: "Model", get: (s) => s.model ?? c.dim("inherit"), maxWidth: 24 },
      { header: "Description", get: (s) => s.description, maxWidth: 70 },
    ]),
  );

  console.log(heading(`Plugins (${data.plugins.length})`));
  console.log(
    renderTable(data.plugins, [
      { header: "ID", get: (p) => p.id, maxWidth: 24 },
      { header: "Name", get: (p) => p.name, maxWidth: 24 },
      { header: "Version", get: (p) => p.version },
      { header: "Enabled", get: (p) => (p.enabled ? c.green("yes") : c.dim("no")) },
      { header: "Description", get: (p) => p.description, maxWidth: 60 },
    ]),
  );
}

async function cmdModels(args: ArgMap) {
  // Lazy-import to avoid pulling chat-models on every command path.
  const { CHAT_MODELS, DEFAULT_CHAT_MODEL } = await import("../src/lib/chat/chat-models");
  const sorted = [...CHAT_MODELS].sort(
    (a, b) =>
      a.pricing.inputCostPerMillionTokensUsd + a.pricing.outputCostPerMillionTokensUsd / 4 -
      (b.pricing.inputCostPerMillionTokensUsd + b.pricing.outputCostPerMillionTokensUsd / 4),
  );
  if (maybeJson(sorted, flagBool(args, "json"))) return;
  console.log(heading("Models — sorted cheapest first"));
  console.log(c.dim("Use the cheapest model that meets your needs when testing AI features."));
  console.log();
  console.log(
    renderTable(sorted, [
      { header: "ID", get: (m) => m.id, maxWidth: 36 },
      { header: "Label", get: (m) => m.label, maxWidth: 24 },
      { header: "Provider", get: (m) => m.provider },
      { header: "In $/M", get: (m) => `$${m.pricing.inputCostPerMillionTokensUsd}`, align: "right" },
      { header: "Out $/M", get: (m) => `$${m.pricing.outputCostPerMillionTokensUsd}`, align: "right" },
      { header: "Effort", get: (m) => (m.supportsEffort ? "yes" : c.dim("no")) },
      { header: "Web", get: (m) => m.webToolVersion },
      { header: "Default", get: (m) => (m.id === DEFAULT_CHAT_MODEL ? c.green("system") : "") },
    ]),
  );
  const cheapest = sorted[0];
  if (cheapest) {
    console.log(
      c.dim(
        `\nCheapest: ${cheapest.id} ($${cheapest.pricing.inputCostPerMillionTokensUsd}/M in, ` +
          `$${cheapest.pricing.outputCostPerMillionTokensUsd}/M out). ` +
          `Pass via task/workflow/trigger frontmatter \`model:\` or chat dropdown.`,
      ),
    );
  }
}

async function cmdUsers(args: ArgMap) {
  const users = await listUsersWithPlugins();
  if (maybeJson(users, flagBool(args, "json"))) return;
  console.log(heading(`Users (${users.length})`));
  console.log(
    renderTable(users, [
      { header: "Email", get: (u) => u.email, maxWidth: 36 },
      { header: "Name", get: (u) => u.name, maxWidth: 28 },
      {
        header: "Role",
        get: (u) =>
          u.banned
            ? c.red("banned")
            : u.role === "admin"
              ? c.magenta("admin")
              : u.role === "user"
                ? c.cyan("user")
                : c.dim(u.role),
      },
      { header: "Verified", get: (u) => (u.emailVerified ? c.green("✓") : c.yellow("✗")) },
      {
        header: "Plugins",
        get: (u) => (u.enabledPlugins.length === 0 ? c.dim("—") : u.enabledPlugins.join(", ")),
        maxWidth: 40,
      },
      { header: "Default model", get: (u) => u.defaultChatModel ?? c.dim("(system)"), maxWidth: 24 },
      { header: "Timezone", get: (u) => u.timezone ?? c.dim("(server)"), maxWidth: 22 },
      { header: "Joined", get: (u) => relativeTime(u.createdAt) },
    ]),
  );

  const adminCount = users.filter((u) => u.role === "admin" && !u.banned).length;
  const bannedCount = users.filter((u) => u.banned).length;
  console.log(
    c.dim(
      `\n${users.length} total · ${adminCount} admin${adminCount === 1 ? "" : "s"}` +
        (bannedCount > 0 ? ` · ${bannedCount} banned` : ""),
    ),
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

function statusColor(status: string | null): string {
  if (!status) return c.dim("—");
  if (status === "success") return c.green(status);
  if (status === "error") return c.red(status);
  return c.yellow(status);
}

function levelTag(level: string): string {
  switch (level) {
    case "critical":
    case "error":
      return c.red(level);
    case "high":
    case "warn":
      return c.yellow(level);
    case "info":
    case "low":
      return c.cyan(level);
    default:
      return c.dim(level);
  }
}

// ── Entry ────────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help") {
    process.stdout.write(HELP);
    return;
  }

  const command = argv.shift();
  const args = parseArgs(argv);

  switch (command) {
    case "logs":
      return cmdLogs(args);
    case "tasks":
      return cmdTasks(args);
    case "workflows":
      return cmdWorkflows(args);
    case "triggers":
      return cmdTriggers(args);
    case "chat":
      return cmdChat(args);
    case "usage":
      return cmdUsage(args);
    case "activity":
      return cmdActivity(args);
    case "notifications":
      return cmdNotifications(args);
    case "doctor":
      return cmdDoctor(args);
    case "config":
      return cmdConfig(args);
    case "models":
      return cmdModels(args);
    case "users":
      return cmdUsers(args);
    default:
      console.error(`Unknown command: ${command}\n`);
      process.stdout.write(HELP);
      process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error(c.red(`\n✗ ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
    // Background side-effects of importing app modules (vault watcher, scheduler
    // global state, plugin init) keep the event loop alive after our work is
    // done. Force exit so the CLI always terminates.
    process.exit(process.exitCode ?? 0);
  });
