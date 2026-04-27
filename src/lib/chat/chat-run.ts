import type { AppChatMessage } from "#/lib/chat/chat";

export type ChatRunStatus = "streaming" | "settled" | "error";

export type ChatRunStats = {
  inputTokens: number;
  outputTokens: number;
  toolCalls: number;
  writes: number;
};

const WRITE_PATTERN = /(^|[._-])(write|create|update|append|delete|move|rename|index|edit|send)\b/i;

export function computeRunStats(messages: AppChatMessage[]): ChatRunStats {
  let toolCalls = 0;
  let writes = 0;
  for (const message of messages) {
    if (!message.parts) continue;
    for (const part of message.parts) {
      const type = (part as { type?: string }).type ?? "";
      let toolName: string | undefined;
      if (type === "dynamic-tool") {
        toolName = (part as { toolName?: string }).toolName;
      } else if (type.startsWith("tool-")) {
        toolName = type.slice("tool-".length);
      } else {
        continue;
      }
      toolCalls += 1;
      if (toolName && WRITE_PATTERN.test(toolName)) writes += 1;
    }
  }

  // Latest message metadata.totals reflects mid-stream cumulative usage.
  let inputTokens = 0;
  let outputTokens = 0;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const totals = messages[i]?.metadata?.totals;
    if (totals) {
      inputTokens = totals.inputTokens;
      outputTokens = totals.outputTokens;
      break;
    }
  }
  return { inputTokens, outputTokens, toolCalls, writes };
}

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function formatRunClock(value: Date | string | undefined): string {
  if (!value) return "--:--:--";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return TIME_FORMAT.format(d);
}

export function formatRunDuration(startedAt: Date | string, endedAt: Date | string): string {
  const start = typeof startedAt === "string" ? new Date(startedAt) : startedAt;
  const end = typeof endedAt === "string" ? new Date(endedAt) : endedAt;
  const ms = Math.max(0, end.getTime() - start.getTime());
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return `${m}m ${r.toString().padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm.toString().padStart(2, "0")}m`;
}

export function formatTokens(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 10_000) return `${(n / 1000).toFixed(2)}K`;
  if (n < 100_000) return `${(n / 1000).toFixed(1)}K`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}K`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

export function formatRunCost(usd: number): string {
  if (usd === 0) return "$0";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}
