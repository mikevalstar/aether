/**
 * NDJSON log file reader for the debug CLI.
 *
 * Parses the rotated `logs/aether.YYYY-MM-DD.N.log` files produced by pino-roll
 * and exposes streaming + pretty-print helpers. Format mirrors what the
 * `/logs` route shows in the UI (see src/lib/log-viewer.functions.ts).
 */

import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import * as ndjson from "ndjson";
import { c, levelColor } from "./format";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

const PINO_LEVELS: Record<number, LogLevel> = {
  10: "trace",
  20: "debug",
  30: "info",
  40: "warn",
  50: "error",
  60: "fatal",
};

const LOG_LEVEL_RANK: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

const LOG_FILE_PATTERN = /^aether\.(\d{4}-\d{2}-\d{2})\.(\d+)\.log$/;

export type LogEntry = {
  timestamp: Date;
  level: LogLevel;
  message: string;
  source: string; // basename of file
  line: number;
  context: Record<string, unknown>;
  error: { message: string; stack?: string } | null;
  raw: Record<string, unknown>;
};

function logRoot(): string {
  return path.resolve(process.cwd(), process.env.LOG_DIR ?? "./logs");
}

/** Group log files in the LOG_DIR by day. Returns Map<YYYY-MM-DD, file paths sorted by sequence>. */
export async function getLogFilesByDay(): Promise<Map<string, string[]>> {
  const root = logRoot();
  let entries: string[];
  try {
    entries = await fs.readdir(root, "utf8");
  } catch {
    return new Map();
  }

  const filesByDay = new Map<string, Array<{ absolutePath: string; sequence: number }>>();
  for (const name of entries) {
    const match = name.match(LOG_FILE_PATTERN);
    if (!match) continue;
    const [, day, sequence] = match;
    const arr = filesByDay.get(day) ?? [];
    arr.push({ absolutePath: path.join(root, name), sequence: Number(sequence) });
    filesByDay.set(day, arr);
  }
  return new Map(
    [...filesByDay.entries()].map(([day, files]) => [
      day,
      files.sort((l, r) => l.sequence - r.sequence).map((f) => f.absolutePath),
    ]),
  );
}

/** Resolve the most recent N day-paths' file lists (newest day first). */
export async function getRecentDayFiles(days: number): Promise<{ day: string; files: string[] }[]> {
  const byDay = await getLogFilesByDay();
  const sortedDays = [...byDay.keys()].sort((a, b) => b.localeCompare(a));
  return sortedDays.slice(0, days).map((day) => ({ day, files: byDay.get(day) ?? [] }));
}

function levelOf(value: unknown): LogLevel {
  if (typeof value === "number" && value in PINO_LEVELS) return PINO_LEVELS[value];
  if (typeof value === "string") {
    const norm = value.toLowerCase();
    if (norm in LOG_LEVEL_RANK) return norm as LogLevel;
  }
  return "info";
}

function recordToEntry(record: Record<string, unknown>, source: string, line: number): LogEntry {
  const time = typeof record.time === "number" || typeof record.time === "string" ? new Date(record.time) : new Date(0);
  const level = levelOf(record.level);
  const message =
    (typeof record.msg === "string" && record.msg) || (typeof record.message === "string" && record.message) || "Log entry";

  let error: LogEntry["error"] = null;
  if (record.err && typeof record.err === "object") {
    const errObj = record.err as Record<string, unknown>;
    error = {
      message: typeof errObj.message === "string" ? errObj.message : String(errObj.message ?? ""),
      stack: typeof errObj.stack === "string" ? errObj.stack : undefined,
    };
  }

  const { level: _l, time: _t, pid: _p, hostname: _h, msg: _m, message: _msg, err: _e, ...context } = record;

  return { timestamp: time, level, message, source, line, context, error, raw: record };
}

export type StreamOptions = {
  files: string[];
  /** Minimum level (inclusive). */
  minLevel?: LogLevel;
  /** Case-insensitive substring match against full JSON line. */
  grep?: RegExp;
};

/** Stream entries from the given files in order. */
export async function* streamLogEntries(opts: StreamOptions): AsyncGenerator<LogEntry> {
  const minRank = opts.minLevel ? LOG_LEVEL_RANK[opts.minLevel] : 0;

  for (const filePath of opts.files) {
    const source = path.basename(filePath);
    const stream = createReadStream(filePath, { encoding: "utf8" }).pipe(ndjson.parse({ strict: false }));
    let line = 0;
    for await (const raw of stream as AsyncIterable<unknown>) {
      line += 1;
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const record = raw as Record<string, unknown>;
      const entry = recordToEntry(record, source, line);
      if (LOG_LEVEL_RANK[entry.level] < minRank) continue;
      if (opts.grep) {
        try {
          const text = JSON.stringify(record);
          if (!opts.grep.test(text)) continue;
        } catch {
          continue;
        }
      }
      yield entry;
    }
  }
}

/** Collect all entries (used when caller wants newest-first slicing). */
export async function collectLogEntries(opts: StreamOptions): Promise<LogEntry[]> {
  const out: LogEntry[] = [];
  for await (const entry of streamLogEntries(opts)) out.push(entry);
  return out;
}

/** Pretty-print one entry to stdout (single line + indented context/error). */
export function printEntry(entry: LogEntry, opts?: { showSource?: boolean }) {
  const ts = entry.timestamp.toISOString().replace("T", " ").slice(0, 19);
  const level = levelColor(entry.level)(entry.level.toUpperCase().padEnd(5));
  const source = opts?.showSource ? c.dim(`${entry.source}:${entry.line} `) : "";
  process.stdout.write(`${c.dim(ts)} ${level} ${source}${entry.message}\n`);

  const ctxKeys = Object.keys(entry.context);
  if (ctxKeys.length > 0) {
    const compact: string[] = [];
    for (const key of ctxKeys.slice(0, 8)) {
      const value = entry.context[key];
      let formatted: string;
      if (typeof value === "string") {
        formatted = value.length > 80 ? `${value.slice(0, 77)}…` : value;
      } else if (typeof value === "number" || typeof value === "boolean" || value === null) {
        formatted = String(value);
      } else {
        const json = JSON.stringify(value);
        formatted = json && json.length > 80 ? `${json.slice(0, 77)}…` : (json ?? "");
      }
      compact.push(`${c.dim(`${key}=`)}${formatted}`);
    }
    process.stdout.write(`      ${compact.join(" ")}\n`);
  }

  if (entry.error?.stack) {
    process.stdout.write(
      c.red(
        entry.error.stack
          .split("\n")
          .map((l) => `      ${l}`)
          .join("\n"),
      ),
    );
    process.stdout.write("\n");
  } else if (entry.error?.message) {
    process.stdout.write(`      ${c.red(entry.error.message)}\n`);
  }
}
