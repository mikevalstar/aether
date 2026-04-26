/**
 * Tiny terminal formatting helpers used by the debug CLI.
 * Intentionally dependency-free — printf-style tables and ANSI colors only.
 */

const SUPPORTS_COLOR = process.stdout.isTTY && process.env.NO_COLOR !== "1";

const ANSI = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function paint(s: string, code: string): string {
  if (!SUPPORTS_COLOR) return s;
  return `${code}${s}${ANSI.reset}`;
}

export const c = {
  dim: (s: string) => paint(s, ANSI.dim),
  bold: (s: string) => paint(s, ANSI.bold),
  red: (s: string) => paint(s, ANSI.red),
  green: (s: string) => paint(s, ANSI.green),
  yellow: (s: string) => paint(s, ANSI.yellow),
  blue: (s: string) => paint(s, ANSI.blue),
  magenta: (s: string) => paint(s, ANSI.magenta),
  cyan: (s: string) => paint(s, ANSI.cyan),
  gray: (s: string) => paint(s, ANSI.gray),
};

export function levelColor(level: string): (s: string) => string {
  switch (level) {
    case "fatal":
    case "error":
      return c.red;
    case "warn":
      return c.yellow;
    case "info":
      return c.cyan;
    case "debug":
      return c.gray;
    case "trace":
      return c.dim;
    default:
      return (s) => s;
  }
}

// Strip ANSI escape sequences when measuring visible width.
// biome-ignore lint/suspicious/noControlCharactersInRegex: matching real ANSI escapes
const ANSI_PATTERN = /\[[0-9;]*m/g;
function visibleLength(s: string): number {
  return s.replace(ANSI_PATTERN, "").length;
}

export function pad(s: string, width: number): string {
  const visible = visibleLength(s);
  if (visible >= width) return s;
  return s + " ".repeat(width - visible);
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  if (max <= 1) return s.slice(0, max);
  return `${s.slice(0, max - 1)}…`;
}

export type Column<T> = {
  header: string;
  /** Get the raw value for this row (used for width calc + render). */
  get: (row: T) => string;
  /** Optional max width — value will be truncated. */
  maxWidth?: number;
  /** Right-align the column. */
  align?: "right";
};

/** Render a compact, aligned ASCII table. */
export function renderTable<T>(rows: T[], columns: Column<T>[]): string {
  if (rows.length === 0) return c.dim("(none)");

  // Compute widths
  const widths = columns.map((col) => {
    const headerLen = col.header.length;
    const dataLen = rows.reduce((max, row) => {
      const raw = col.get(row);
      const truncated = col.maxWidth ? truncate(raw, col.maxWidth) : raw;
      return Math.max(max, visibleLength(truncated));
    }, 0);
    return Math.max(headerLen, dataLen);
  });

  const lines: string[] = [];

  // Header
  lines.push(
    columns
      .map((col, i) => {
        const header = c.bold(col.header);
        return col.align === "right"
          ? header.padStart(widths[i] + (header.length - col.header.length))
          : pad(header, widths[i]);
      })
      .join("  "),
  );
  lines.push(c.dim(columns.map((_, i) => "─".repeat(widths[i])).join("  ")));

  // Rows
  for (const row of rows) {
    lines.push(
      columns
        .map((col, i) => {
          const raw = col.get(row);
          const truncated = col.maxWidth ? truncate(raw, col.maxWidth) : raw;
          if (col.align === "right") {
            const visible = visibleLength(truncated);
            const padding = widths[i] - visible;
            return padding > 0 ? " ".repeat(padding) + truncated : truncated;
          }
          return pad(truncated, widths[i]);
        })
        .join("  "),
    );
  }

  return lines.join("\n");
}

/** Format a Date / ISO string as a short relative time ("5m ago", "2h ago"). */
export function relativeTime(input: Date | string | null | undefined): string {
  if (!input) return "—";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "—";
  const ms = Date.now() - date.getTime();
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

/** Format a number as USD with up to 4 decimals. */
export function fmtUsd(value: number): string {
  if (!Number.isFinite(value)) return "$—";
  if (value === 0) return "$0";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

/** Format an integer with thousands separators. */
export function fmtInt(value: number): string {
  return value.toLocaleString("en-US");
}

/** Print as JSON when --json flag is set. */
export function maybeJson(data: unknown, json: boolean): boolean {
  if (!json) return false;
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
  return true;
}

/** Section header. */
export function heading(label: string): string {
  return `\n${c.bold(c.cyan(`▸ ${label}`))}`;
}
