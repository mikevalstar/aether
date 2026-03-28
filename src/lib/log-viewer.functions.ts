import { createReadStream, type Dirent, promises as fs } from "node:fs";
import path from "node:path";
import { createServerFn } from "@tanstack/react-start";
import * as ndjson from "ndjson";
import { z } from "zod";
import { ensureSession } from "#/lib/auth.functions";

const logViewerInputSchema = z
  .object({
    day: z.string().trim().optional(),
    query: z.string().trim().optional(),
    level: z.string().trim().optional(),
    page: z.coerce.number().int().min(1).optional(),
  })
  .strict();

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export type LogViewerEntry = {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  sourceFile: string;
  line: number;
  contextItems: Array<{ key: string; value: string }>;
  errorMessage: string | null;
  detailsJson: string;
};

export type LogViewerResult = {
  availableDays: string[];
  selectedDay?: string;
  filters: {
    query: string;
    level: "all" | LogLevel;
  };
  entries: LogViewerEntry[];
  page: number;
  pageSize: number;
  totalEntries: number;
  totalMatched: number;
  totalPages: number;
  matchedLevelCounts: Record<LogLevel, number>;
};

const LOG_ROOT = path.resolve(process.cwd(), process.env.LOG_DIR ?? "./logs");
const PAGE_SIZE = 100;
const LOG_FILE_PATTERN = /^aether\.(\d{4}-\d{2}-\d{2})\.(\d+)\.log$/;
const PINO_LEVELS: Record<number, LogLevel> = {
  10: "trace",
  20: "debug",
  30: "info",
  40: "warn",
  50: "error",
  60: "fatal",
};

export const getLogViewerData = createServerFn({ method: "GET" })
  .inputValidator((data) => logViewerInputSchema.parse(data))
  .handler(async ({ data }): Promise<LogViewerResult> => {
    await ensureSession();

    const requestedPage = Math.max(1, data.page ?? 1);
    const requestedLevel = normalizeLevelFilter(data.level);
    const requestedQuery = data.query?.trim() ?? "";
    const dayFiles = await getDayFiles();
    const availableDays = [...dayFiles.keys()].sort((left, right) => right.localeCompare(left));
    const selectedDay = data.day && dayFiles.has(data.day) ? data.day : availableDays[0];

    if (!selectedDay) {
      return {
        availableDays,
        selectedDay: undefined,
        filters: {
          query: requestedQuery,
          level: requestedLevel,
        },
        entries: [],
        page: 1,
        pageSize: PAGE_SIZE,
        totalEntries: 0,
        totalMatched: 0,
        totalPages: 0,
        matchedLevelCounts: emptyLevelCounts(),
      };
    }

    const result = await readLogDay({
      files: dayFiles.get(selectedDay) ?? [],
      page: requestedPage,
      query: requestedQuery,
      level: requestedLevel,
    });

    return {
      availableDays,
      selectedDay,
      filters: {
        query: requestedQuery,
        level: requestedLevel,
      },
      ...result,
    };
  });

async function getDayFiles() {
  let entries: Dirent<string>[];

  try {
    entries = await fs.readdir(LOG_ROOT, { encoding: "utf8", withFileTypes: true });
  } catch (error) {
    if (isMissingDirectoryError(error)) {
      return new Map<string, string[]>();
    }

    throw error;
  }

  const filesByDay = new Map<string, Array<{ absolutePath: string; sequence: number }>>();

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const match = entry.name.match(LOG_FILE_PATTERN);
    if (!match) {
      continue;
    }

    const [, day, sequence] = match;
    const dayFiles = filesByDay.get(day) ?? [];
    dayFiles.push({
      absolutePath: path.join(LOG_ROOT, entry.name),
      sequence: Number(sequence),
    });
    filesByDay.set(day, dayFiles);
  }

  return new Map(
    [...filesByDay.entries()].map(([day, files]) => [
      day,
      files.sort((left, right) => left.sequence - right.sequence).map((file) => file.absolutePath),
    ]),
  );
}

async function readLogDay({
  files,
  page,
  query,
  level,
}: {
  files: string[];
  page: number;
  query: string;
  level: "all" | LogLevel;
}) {
  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const queryNeedle = query.toLowerCase();
  const matchedLevelCounts = emptyLevelCounts();
  const entries: LogViewerEntry[] = [];
  let totalEntries = 0;
  let totalMatched = 0;

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const parser = createReadStream(filePath, { encoding: "utf8" }).pipe(ndjson.parse({ strict: false }));
    let line = 0;

    for await (const rawRecord of parser as AsyncIterable<unknown>) {
      line += 1;
      totalEntries += 1;

      if (!isRecord(rawRecord)) {
        continue;
      }

      const logLevel = getLogLevel(rawRecord.level);
      if (level !== "all" && logLevel !== level) {
        continue;
      }

      if (queryNeedle && !buildSearchableText(rawRecord).includes(queryNeedle)) {
        continue;
      }

      totalMatched += 1;
      matchedLevelCounts[logLevel] += 1;

      if (totalMatched > startIndex && totalMatched <= endIndex) {
        entries.push(createLogViewerEntry(rawRecord, fileName, line, logLevel));
      }
    }
  }

  return {
    entries,
    page,
    pageSize: PAGE_SIZE,
    totalEntries,
    totalMatched,
    totalPages: totalMatched === 0 ? 0 : Math.ceil(totalMatched / PAGE_SIZE),
    matchedLevelCounts,
  };
}

function createLogViewerEntry(
  record: Record<string, unknown>,
  sourceFile: string,
  line: number,
  level: LogLevel,
): LogViewerEntry {
  const timestamp = toIsoTimestamp(record.time);
  const errorObject = isRecord(record.err) ? record.err : null;
  const errorMessage = typeof errorObject?.message === "string" ? errorObject.message : null;
  const contextRecord = getContextRecord(record);

  return {
    id: `${sourceFile}:${line}`,
    timestamp,
    level,
    message: getMessage(record),
    sourceFile,
    line,
    contextItems: Object.entries(contextRecord)
      .slice(0, 5)
      .map(([key, value]) => ({ key, value: formatContextValue(value) })),
    errorMessage,
    detailsJson: safeJsonStringify(record),
  };
}

function getContextRecord(record: Record<string, unknown>) {
  const { level: _level, time: _time, pid: _pid, hostname: _hostname, msg: _msg, message: _message, ...rest } = record;
  return rest;
}

function getMessage(record: Record<string, unknown>) {
  if (typeof record.msg === "string" && record.msg.trim()) {
    return record.msg;
  }

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message;
  }

  return "Log entry";
}

function buildSearchableText(record: Record<string, unknown>) {
  return safeJsonStringify(record).toLowerCase();
}

function formatContextValue(value: unknown) {
  if (typeof value === "string") {
    return value.length > 120 ? `${value.slice(0, 117)}...` : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value === null || value === undefined) {
    return String(value);
  }

  const serialized = safeJsonStringify(value).replaceAll("\n", " ");
  return serialized.length > 120 ? `${serialized.slice(0, 117)}...` : serialized;
}

function toIsoTimestamp(value: unknown) {
  if (typeof value === "number" || typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return new Date(0).toISOString();
}

function normalizeLevelFilter(level?: string): "all" | LogLevel {
  if (!level) {
    return "all";
  }

  const normalized = level.toLowerCase();
  return isLogLevel(normalized) ? normalized : "all";
}

function getLogLevel(value: unknown): LogLevel {
  if (typeof value === "number" && value in PINO_LEVELS) {
    return PINO_LEVELS[value as keyof typeof PINO_LEVELS];
  }

  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (isLogLevel(normalized)) {
      return normalized;
    }
  }

  return "info";
}

function emptyLevelCounts(): Record<LogLevel, number> {
  return {
    trace: 0,
    debug: 0,
    info: 0,
    warn: 0,
    error: 0,
    fatal: 0,
  };
}

function isLogLevel(value: string): value is LogLevel {
  return (
    value === "trace" || value === "debug" || value === "info" || value === "warn" || value === "error" || value === "fatal"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeJsonStringify(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isMissingDirectoryError(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
