import type { LanguageModelUsage, ToolSet } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RunTimer, withToolTiming } from "#/lib/chat/run-timing";

/**
 * RunTimer reads `performance.now()` for every boundary. We feed it a fixed
 * sequence so each test asserts exact durations. recordTool() takes explicit
 * monotonic values, so it does NOT consume from the queue — only start(),
 * markFirstChunk(), markStep(), clock() and finish() do.
 */
let clock: number[] = [];
let clockIdx = 0;

beforeEach(() => {
  clockIdx = 0;
  vi.spyOn(performance, "now").mockImplementation(() => clock[clockIdx++] ?? clock.at(-1) ?? 0);
});

afterEach(() => vi.restoreAllMocks());

function usage(outputTokens: number, inputTokens = 0): LanguageModelUsage {
  return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens } as LanguageModelUsage;
}

describe("RunTimer.finish", () => {
  it("subtracts tool time from wall-clock and computes post-TTFT throughput", () => {
    clock = [0 /* start */, 100 /* firstChunk */, 1100 /* finish */];
    const timer = new RunTimer();
    timer.start();
    timer.markFirstChunk();
    timer.recordTool("obsidian_read", 200, 700); // 500ms tool span

    const result = timer.finish(usage(1000));

    // wall-clock 1100 − 500 tool = 600 gen; speed window = 600 − 100 ttft = 500ms
    expect(result.genDurationMs).toBe(600);
    expect(result.toolDurationMs).toBe(500);
    expect(result.ttftMs).toBe(100);
    expect(result.tokensPerSecond).toBe(2000); // 1000 tok / 0.5s
  });

  it("merges overlapping tool spans (union, not sum)", () => {
    clock = [0 /* start */, 1000 /* finish */];
    const timer = new RunTimer();
    timer.start();
    timer.recordTool("a", 100, 400);
    timer.recordTool("b", 300, 600); // overlaps a → union [100,600] = 500ms

    const result = timer.finish(usage(500));

    expect(result.toolDurationMs).toBe(500);
    expect(result.genDurationMs).toBe(500); // 1000 − 500
    // no TTFT recorded → end-to-end rate over the full gen window
    expect(result.ttftMs).toBeNull();
    expect(result.tokensPerSecond).toBe(1000); // 500 tok / 0.5s
  });

  it("returns null TTFT and end-to-end speed on a non-streaming run", () => {
    clock = [0 /* start */, 2000 /* finish */];
    const timer = new RunTimer();
    timer.start();
    const result = timer.finish(usage(1000));

    expect(result.ttftMs).toBeNull();
    expect(result.genDurationMs).toBe(2000);
    expect(result.tokensPerSecond).toBe(500); // 1000 tok / 2s
  });

  it("returns null throughput when there are no output tokens", () => {
    clock = [0, 500];
    const timer = new RunTimer();
    timer.start();
    const result = timer.finish(usage(0));
    expect(result.tokensPerSecond).toBeNull();
  });

  it("never lets tool time drive gen duration negative", () => {
    clock = [0, 300];
    const timer = new RunTimer();
    timer.start();
    timer.recordTool("a", 0, 1000); // tool span longer than wall-clock (clock skew)
    const result = timer.finish(usage(100));
    expect(result.genDurationMs).toBe(0);
    expect(result.tokensPerSecond).toBeNull(); // zero gen window
  });

  it("builds a per-step breakdown with tool attribution", () => {
    // start, step1 boundary, step2 boundary, finish
    clock = [0, 500, 1200, 1200];
    const timer = new RunTimer();
    timer.start();
    timer.recordTool("obsidian_read", 100, 300); // within step 1 window [0,500]
    timer.markStep(usage(40, 10)); // step 1 ends at 500
    timer.markStep(usage(80, 20)); // step 2 ends at 1200

    const breakdown = JSON.parse(timer.finish(usage(120, 30)).breakdownJson);
    expect(breakdown.steps).toHaveLength(2);
    // step 1: window 500 − 200 tool = 300 gen, one tool attributed
    expect(breakdown.steps[0].genMs).toBe(300);
    expect(breakdown.steps[0].tools).toEqual([{ name: "obsidian_read", durationMs: 200 }]);
    expect(breakdown.steps[0].outputTokens).toBe(40);
    // step 2: window 700, no tools
    expect(breakdown.steps[1].genMs).toBe(700);
    expect(breakdown.steps[1].tools).toEqual([]);
  });
});

describe("withToolTiming", () => {
  it("records wall-clock for a promise-returning tool", async () => {
    clock = [0 /* start */, 200 /* tool start */, 500 /* tool end */, 800 /* finish */];
    const timer = new RunTimer();
    const tools: ToolSet = {
      // biome-ignore lint/suspicious/noExplicitAny: minimal fake tool for the test
      my_tool: { description: "x", execute: async () => "ok" } as any,
    };
    const wrapped = withToolTiming(tools, timer);
    timer.start();
    // biome-ignore lint/suspicious/noExplicitAny: invoking the wrapped execute directly
    const out = await (wrapped.my_tool as any).execute({}, {});
    expect(out).toBe("ok");

    const result = timer.finish(usage(300));
    expect(result.toolDurationMs).toBe(300); // 500 − 200
    expect(result.genDurationMs).toBe(500); // 800 − 300
    const breakdown = JSON.parse(result.breakdownJson);
    expect(breakdown.tools).toEqual([{ name: "my_tool", durationMs: 300 }]);
  });

  it("times an async-generator tool over its full lifetime", async () => {
    clock = [0 /* start */, 100 /* tool start */, 900 /* tool end */, 900 /* finish */];
    const timer = new RunTimer();
    const genTool = {
      description: "x",
      async *execute() {
        yield 1;
        yield 2;
      },
    };
    // biome-ignore lint/suspicious/noExplicitAny: minimal fake async-generator tool
    const tools: ToolSet = { spawn_sub_agents: genTool as any };
    const wrapped = withToolTiming(tools, timer);
    timer.start();
    // biome-ignore lint/suspicious/noExplicitAny: invoking the wrapped execute directly
    const gen = (wrapped.spawn_sub_agents as any).execute({}, {});
    const seen: number[] = [];
    for await (const v of gen) seen.push(v);
    expect(seen).toEqual([1, 2]);

    const result = timer.finish(usage(0));
    expect(result.toolDurationMs).toBe(800); // 900 − 100
  });

  it("leaves provider tools without an execute untouched", () => {
    const timer = new RunTimer();
    // biome-ignore lint/suspicious/noExplicitAny: provider tool has no JS execute
    const providerTool = { type: "provider-defined", name: "web_search" } as any;
    const tools: ToolSet = { web_search: providerTool };
    const wrapped = withToolTiming(tools, timer);
    expect(wrapped.web_search).toBe(providerTool);
  });
});
