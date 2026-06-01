import type { LanguageModelUsage, ToolSet } from "ai";

/**
 * Per-run timing instrumentation for AI generations.
 *
 * Captures three things the raw AI SDK does not expose together:
 *  - time-to-first-token (TTFT) — only meaningful on streaming paths
 *  - generation-only wall-clock — total wall-clock minus time spent in tool calls
 *  - per-step + per-tool breakdown — what each agent-loop step and tool cost
 *
 * Why we subtract tool time: a single ChatUsageEvent spans a whole agent loop
 * (up to `stepCountIs(20)` steps) interleaved with tool execution. Wall-clock
 * therefore bundles model generation, tool round-trips, and (for the parent of
 * a sub-agent spawn) the entire concurrent sub-agent run. `tokensPerSecond`
 * computed against raw wall-clock would badly understate generation speed, so
 * we subtract the merged tool span to isolate model time.
 *
 * All times use a monotonic clock (`performance.now()`) so NTP adjustments can
 * never produce negative or jittery durations on sub-second steps.
 */

/** A single tool invocation's wall-clock span, in monotonic ms. */
type ToolInterval = { name: string; start: number; end: number };

/** Per-step usage captured at each `onStepFinish`, plus the boundary timestamp. */
type StepMark = { boundary: number; usage: LanguageModelUsage | undefined };

export type ToolTimingBreakdown = { name: string; durationMs: number };

export type StepTimingBreakdown = {
  index: number;
  /** Generation-only ms for this step (step wall-clock minus its tool spans). */
  genMs: number;
  inputTokens: number;
  outputTokens: number;
  tools: ToolTimingBreakdown[];
};

export type RunTimingBreakdown = {
  steps: StepTimingBreakdown[];
  tools: ToolTimingBreakdown[];
};

export type RunTimingResult = {
  genDurationMs: number;
  /** null on non-streaming paths (e.g. executor `generateText`). */
  ttftMs: number | null;
  toolDurationMs: number;
  /** null when it cannot be computed (no output tokens or zero gen time). */
  tokensPerSecond: number | null;
  breakdownJson: string;
};

/** Persist-ready columns for a `ChatUsageEvent`, derived from a `RunTimingResult`. */
export function timingToEventFields(timing: RunTimingResult) {
  return {
    genDurationMs: timing.genDurationMs,
    ttftMs: timing.ttftMs,
    toolDurationMs: timing.toolDurationMs,
    tokensPerSecond: timing.tokensPerSecond,
    breakdownJson: timing.breakdownJson,
  };
}

/** Merge overlapping intervals and return the total covered length (the union). */
function unionLength(intervals: Array<{ start: number; end: number }>): number {
  if (intervals.length === 0) return 0;
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  let total = 0;
  let curStart = sorted[0].start;
  let curEnd = sorted[0].end;
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    if (next.start > curEnd) {
      total += curEnd - curStart;
      curStart = next.start;
      curEnd = next.end;
    } else if (next.end > curEnd) {
      curEnd = next.end;
    }
  }
  total += curEnd - curStart;
  return total;
}

export class RunTimer {
  private t0 = 0;
  private firstChunkAt: number | null = null;
  private readonly tools: ToolInterval[] = [];
  private readonly steps: StepMark[] = [];

  private now(): number {
    return performance.now();
  }

  /** Call immediately before invoking `streamText` / `generateText`. */
  start(): void {
    this.t0 = this.now();
  }

  /** Call on the first streamed model output (text or reasoning). No-ops after the first call. */
  markFirstChunk(): void {
    if (this.firstChunkAt === null) this.firstChunkAt = this.now();
  }

  /** Call from `onStepFinish` with the step's usage. */
  markStep(usage: LanguageModelUsage | undefined): void {
    this.steps.push({ boundary: this.now(), usage });
  }

  /** Record a completed tool call's span. Times are monotonic `performance.now()` values. */
  recordTool(name: string, startMs: number, endMs: number): void {
    this.tools.push({ name, start: startMs, end: endMs });
  }

  /** Read the monotonic clock (so tool wrappers can stamp start/end consistently). */
  clock(): number {
    return this.now();
  }

  /** Finalize and compute metrics. Call once, after generation completes. */
  finish(totalUsage: LanguageModelUsage | undefined): RunTimingResult {
    const end = this.now();
    const totalWallClock = Math.max(0, end - this.t0);
    const toolDurationMs = unionLength(this.tools);
    const genDurationMs = Math.max(0, totalWallClock - toolDurationMs);
    const ttftMs = this.firstChunkAt === null ? null : Math.max(0, this.firstChunkAt - this.t0);

    const outputTokens = totalUsage?.outputTokens ?? 0;
    // Post-TTFT inter-token rate where TTFT exists; end-to-end otherwise.
    const speedWindowMs = ttftMs === null ? genDurationMs : Math.max(0, genDurationMs - ttftMs);
    const tokensPerSecond = outputTokens > 0 && speedWindowMs > 0 ? round2((outputTokens / speedWindowMs) * 1000) : null;

    return {
      genDurationMs: Math.round(genDurationMs),
      ttftMs: ttftMs === null ? null : Math.round(ttftMs),
      toolDurationMs: Math.round(toolDurationMs),
      tokensPerSecond,
      breakdownJson: JSON.stringify(this.buildBreakdown()),
    };
  }

  private buildBreakdown(): RunTimingBreakdown {
    const tools: ToolTimingBreakdown[] = this.tools.map((t) => ({
      name: t.name,
      durationMs: Math.round(t.end - t.start),
    }));

    const steps: StepTimingBreakdown[] = [];
    let prevBoundary = this.t0;
    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      const windowStart = prevBoundary;
      const windowEnd = step.boundary;
      // Tool spans that fall within this step's window (clamped to the window).
      const within = this.tools
        .filter((t) => t.end > windowStart && t.start < windowEnd)
        .map((t) => ({ start: Math.max(t.start, windowStart), end: Math.min(t.end, windowEnd) }));
      const stepToolMs = unionLength(within);
      const genMs = Math.max(0, windowEnd - windowStart - stepToolMs);
      const stepTools = this.tools
        .filter((t) => t.end > windowStart && t.start < windowEnd)
        .map((t) => ({ name: t.name, durationMs: Math.round(t.end - t.start) }));
      steps.push({
        index: i,
        genMs: Math.round(genMs),
        inputTokens: step.usage?.inputTokens ?? 0,
        outputTokens: step.usage?.outputTokens ?? 0,
        tools: stepTools,
      });
      prevBoundary = step.boundary;
    }

    return { steps, tools };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Wrap every tool in a `ToolSet` so each invocation's wall-clock is recorded on
 * `timer`. Tools without a JS `execute` (provider-executed tools like
 * `web_search` / `web_fetch` / `code_execution`) are left untouched — their time
 * is part of the model's own generation, not a separate round-trip we can time.
 * Handles both promise-returning and async-generator (`spawn_sub_agents`) tools.
 */
export function withToolTiming(tools: ToolSet, timer: RunTimer): ToolSet {
  const wrapped: ToolSet = {};
  for (const [name, tool] of Object.entries(tools)) {
    // biome-ignore lint/suspicious/noExplicitAny: Tool union types vary; execute shape is checked at runtime.
    const exec = (tool as any).execute;
    if (typeof exec !== "function") {
      wrapped[name] = tool;
      continue;
    }
    // biome-ignore lint/suspicious/noExplicitAny: preserve original tool shape, override execute only.
    wrapped[name] = { ...(tool as any), execute: timeExecute(name, exec, timer) } as ToolSet[string];
  }
  return wrapped;
}

// biome-ignore lint/suspicious/noExplicitAny: generic passthrough wrapper for arbitrary tool executes.
function timeExecute(name: string, exec: (...args: any[]) => any, timer: RunTimer) {
  // biome-ignore lint/suspicious/noExplicitAny: forward whatever the SDK passes through unchanged.
  return (...args: any[]) => {
    const start = timer.clock();
    let result: unknown;
    try {
      result = exec(...args);
    } catch (err) {
      timer.recordTool(name, start, timer.clock());
      throw err;
    }
    // Async-generator tools (e.g. spawn_sub_agents) — time the full generator lifetime.
    if (result && typeof (result as AsyncIterable<unknown>)[Symbol.asyncIterator] === "function") {
      const iterable = result as AsyncIterable<unknown>;
      return (async function* () {
        try {
          yield* iterable;
        } finally {
          timer.recordTool(name, start, timer.clock());
        }
      })();
    }
    // Promise (or sync) returning tools.
    return Promise.resolve(result).then(
      (value) => {
        timer.recordTool(name, start, timer.clock());
        return value;
      },
      (err) => {
        timer.recordTool(name, start, timer.clock());
        throw err;
      },
    );
  };
}
