import { createServerFn } from "@tanstack/react-start";
import dayjs from "dayjs";
import { z } from "zod";
import { prisma } from "#/db";
import { ensureSession } from "#/lib/auth.functions";
import { resolveModelId } from "#/lib/chat/chat";
import { buildUsageDateRange, getChatModelLabel, normalizeUsageSearch } from "#/lib/chat/chat-usage";

const usageSearchInputSchema = z
  .object({
    from: z.string().trim().optional(),
    to: z.string().trim().optional(),
    model: z.string().trim().optional(),
    taskType: z.string().trim().optional(),
  })
  .strict();

type DailyUsagePoint = {
  date: string;
  label: string;
  estimatedCostUsd: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  events: number;
  /**
   * Per-model breakdowns keyed by model label:
   *  - `"Haiku 4.5"` → cost, `"…__tokens"` → tokens, `"…__events"` → prompt count
   *  - `"…__tps"` → weighted tokens/sec that day (null when no timed events)
   */
  [modelLabel: string]: string | number | null;
};

type ModelBreakdownPoint = {
  model: string;
  label: string;
  estimatedCostUsd: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  events: number;
  shareOfCost: number;
  /** Weighted output tokens/sec across timed events for this model (null if none timed). */
  tokensPerSecond: number | null;
  /** Mean time-to-first-token in ms across events that recorded it (null if none). */
  avgTtftMs: number | null;
};

/** Running accumulators for throughput, kept out of the public shape. */
type SpeedAccumulator = {
  /** Output tokens summed over events that recorded a gen duration. */
  timedOutputTokens: number;
  /** Gen-only seconds summed over those same events (post-TTFT window). */
  speedWindowSeconds: number;
  ttftMsSum: number;
  ttftCount: number;
};

export type ChatUsageStatsResult = {
  search: { from?: string; to?: string; model: string };
  /** Unique model labels present in daily usage, ordered by total cost descending */
  dailyUsageModels: string[];
  totals: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
    events: number;
    averageCostPerEvent: number;
    averageTokensPerEvent: number;
    activeDays: number;
    /** Weighted output tokens/sec across all timed events (null if none recorded timing). */
    tokensPerSecond: number | null;
    /** Mean time-to-first-token in ms across events that recorded it (null if none). */
    avgTtftMs: number | null;
    /** Number of events that carry timing data (streaming + executor; excludes legacy rows). */
    timedEvents: number;
  };
  dailyUsage: DailyUsagePoint[];
  modelBreakdown: ModelBreakdownPoint[];
  recentEvents: Array<{
    id: string;
    createdAt: string;
    model: string;
    modelLabel: string;
    taskType: string;
    threadId: string | null;
    threadTitle: string | null;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
    tokensPerSecond: number | null;
    ttftMs: number | null;
    genDurationMs: number | null;
  }>;
  availableModels: Array<{
    id: string;
    label: string;
  }>;
  dateBounds: {
    firstEventAt: string | null;
    lastEventAt: string | null;
  };
};

type TimedEvent = {
  outputTokens: number;
  genDurationMs: number | null;
  ttftMs: number | null;
};

/**
 * The "speed window" for an event is the wall-clock we attribute to streaming
 * output: post-TTFT generation time when TTFT is known, else the whole gen
 * window. Returns null when the event carries no usable timing.
 */
function speedWindowSeconds(event: TimedEvent): number | null {
  if (event.genDurationMs == null || event.genDurationMs <= 0) return null;
  const windowMs = event.ttftMs == null ? event.genDurationMs : Math.max(0, event.genDurationMs - event.ttftMs);
  return windowMs > 0 ? windowMs / 1000 : null;
}

function emptySpeed(): SpeedAccumulator {
  return { timedOutputTokens: 0, speedWindowSeconds: 0, ttftMsSum: 0, ttftCount: 0 };
}

/** Fold one event into a speed accumulator (mutates and returns it). */
function accumulateSpeed(acc: SpeedAccumulator, event: TimedEvent): SpeedAccumulator {
  const windowSeconds = speedWindowSeconds(event);
  if (windowSeconds != null) {
    acc.timedOutputTokens += event.outputTokens;
    acc.speedWindowSeconds += windowSeconds;
  }
  if (event.ttftMs != null) {
    acc.ttftMsSum += event.ttftMs;
    acc.ttftCount += 1;
  }
  return acc;
}

function speedTokensPerSecond(acc: SpeedAccumulator): number | null {
  if (acc.speedWindowSeconds <= 0 || acc.timedOutputTokens <= 0) return null;
  return Math.round((acc.timedOutputTokens / acc.speedWindowSeconds) * 100) / 100;
}

function speedAvgTtftMs(acc: SpeedAccumulator): number | null {
  return acc.ttftCount > 0 ? Math.round(acc.ttftMsSum / acc.ttftCount) : null;
}

export const getChatUsageStats = createServerFn({ method: "GET" })
  .inputValidator((data) => usageSearchInputSchema.parse(data))
  .handler(async ({ data }): Promise<ChatUsageStatsResult> => {
    const session = await ensureSession();
    const search = normalizeUsageSearch(data);
    const { fromDate, toDateExclusive } = buildUsageDateRange(search);

    const events = await prisma.chatUsageEvent.findMany({
      where: {
        userId: session.user.id,
        model: search.model === "all" ? undefined : search.model,
        taskType: search.taskType === "all" ? undefined : search.taskType,
        createdAt: {
          gte: fromDate,
          lt: toDateExclusive,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const threadIds: string[] = [
      ...new Set(events.map((event) => event.threadId).filter((threadId): threadId is string => Boolean(threadId))),
    ];
    const threads = threadIds.length
      ? await prisma.chatThread.findMany({
          where: {
            userId: session.user.id,
            id: { in: threadIds },
          },
          select: { id: true, title: true },
        })
      : [];
    const threadTitleById = new Map(threads.map((thread) => [thread.id, thread.title]));

    const totals = events.reduce(
      (acc, event) => ({
        inputTokens: acc.inputTokens + event.inputTokens,
        outputTokens: acc.outputTokens + event.outputTokens,
        totalTokens: acc.totalTokens + event.totalTokens,
        estimatedCostUsd: acc.estimatedCostUsd + event.estimatedCostUsd,
        events: acc.events + 1,
      }),
      {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        events: 0,
      },
    );

    const dailyUsageMap = new Map<string, DailyUsagePoint>();
    const modelBreakdownMap = new Map<string, Omit<ModelBreakdownPoint, "tokensPerSecond" | "avgTtftMs">>();
    const overallSpeed = emptySpeed();
    const modelSpeedMap = new Map<string, SpeedAccumulator>();
    // Per (day, model-label) throughput, so the Speed view can plot tok/s over time.
    const dailyModelSpeed = new Map<string, SpeedAccumulator>();

    for (const event of events) {
      const date = dayjs(event.createdAt).format("YYYY-MM-DD");
      const existingDay = dailyUsageMap.get(date) ?? {
        date,
        label: dayjs(event.createdAt).format("MMM D"),
        estimatedCostUsd: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        events: 0,
      };

      existingDay.estimatedCostUsd += event.estimatedCostUsd;
      existingDay.inputTokens += event.inputTokens;
      existingDay.outputTokens += event.outputTokens;
      existingDay.totalTokens += event.totalTokens;
      existingDay.events += 1;

      const modelLabel = getChatModelLabel(event.model);
      existingDay[modelLabel] = ((existingDay[modelLabel] as number) || 0) + event.estimatedCostUsd;
      existingDay[`${modelLabel}__tokens`] = ((existingDay[`${modelLabel}__tokens`] as number) || 0) + event.totalTokens;
      existingDay[`${modelLabel}__events`] = ((existingDay[`${modelLabel}__events`] as number) || 0) + 1;

      dailyUsageMap.set(date, existingDay);

      const resolvedModel = resolveModelId(event.model) ?? event.model;
      const existingModel = modelBreakdownMap.get(resolvedModel) ?? {
        model: resolvedModel,
        label: modelLabel,
        estimatedCostUsd: 0,
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        events: 0,
        shareOfCost: 0,
      };

      existingModel.estimatedCostUsd += event.estimatedCostUsd;
      existingModel.totalTokens += event.totalTokens;
      existingModel.inputTokens += event.inputTokens;
      existingModel.outputTokens += event.outputTokens;
      existingModel.events += 1;
      modelBreakdownMap.set(resolvedModel, existingModel);

      const timed: TimedEvent = {
        outputTokens: event.outputTokens,
        genDurationMs: event.genDurationMs,
        ttftMs: event.ttftMs,
      };
      accumulateSpeed(overallSpeed, timed);
      let modelSpeed = modelSpeedMap.get(resolvedModel);
      if (!modelSpeed) {
        modelSpeed = emptySpeed();
        modelSpeedMap.set(resolvedModel, modelSpeed);
      }
      accumulateSpeed(modelSpeed, timed);

      const dayModelKey = `${date}::${modelLabel}`;
      let dayModelSpeed = dailyModelSpeed.get(dayModelKey);
      if (!dayModelSpeed) {
        dayModelSpeed = emptySpeed();
        dailyModelSpeed.set(dayModelKey, dayModelSpeed);
      }
      accumulateSpeed(dayModelSpeed, timed);
    }

    // Attach per-model tok/s onto each day (null when that model had no timed events).
    for (const [dayModelKey, acc] of dailyModelSpeed) {
      const sep = dayModelKey.indexOf("::");
      const date = dayModelKey.slice(0, sep);
      const modelLabel = dayModelKey.slice(sep + 2);
      const day = dailyUsageMap.get(date);
      if (day) day[`${modelLabel}__tps`] = speedTokensPerSecond(acc);
    }

    // Collect all dynamic keys (model cost, token, event counts) and backfill missing days with 0
    const staticKeys = new Set([
      "date",
      "label",
      "estimatedCostUsd",
      "inputTokens",
      "outputTokens",
      "totalTokens",
      "events",
    ]);
    const allDynamicKeys = new Set<string>();
    for (const day of dailyUsageMap.values()) {
      for (const key of Object.keys(day)) {
        if (!staticKeys.has(key)) {
          allDynamicKeys.add(key);
        }
      }
    }
    for (const day of dailyUsageMap.values()) {
      for (const key of allDynamicKeys) {
        if (!(key in day)) {
          // Throughput gaps stay null so the Speed line bridges them; counts/costs are 0.
          day[key] = key.endsWith("__tps") ? null : 0;
        }
      }
    }

    const dailyUsage = [...dailyUsageMap.values()];
    const modelBreakdown = [...modelBreakdownMap.entries()]
      .map(([model, item]) => {
        const speed = modelSpeedMap.get(model) ?? emptySpeed();
        return {
          ...item,
          shareOfCost: totals.estimatedCostUsd > 0 ? item.estimatedCostUsd / totals.estimatedCostUsd : 0,
          tokensPerSecond: speedTokensPerSecond(speed),
          avgTtftMs: speedAvgTtftMs(speed),
        };
      })
      .sort((left, right) => right.estimatedCostUsd - left.estimatedCostUsd);

    const dailyUsageModels = modelBreakdown.map((item) => item.label);

    const recentEvents = [...events]
      .reverse()
      .slice(0, 10)
      .map((event) => ({
        id: event.id,
        createdAt: event.createdAt.toISOString(),
        model: event.model,
        modelLabel: getChatModelLabel(event.model),
        taskType: event.taskType,
        threadId: event.threadId,
        threadTitle: event.threadId ? (threadTitleById.get(event.threadId) ?? "Deleted thread") : null,
        inputTokens: event.inputTokens,
        outputTokens: event.outputTokens,
        totalTokens: event.totalTokens,
        estimatedCostUsd: event.estimatedCostUsd,
        tokensPerSecond: event.tokensPerSecond,
        ttftMs: event.ttftMs,
        genDurationMs: event.genDurationMs,
      }));

    return {
      search,
      dailyUsageModels,
      totals: {
        ...totals,
        averageCostPerEvent: totals.events > 0 ? totals.estimatedCostUsd / totals.events : 0,
        averageTokensPerEvent: totals.events > 0 ? totals.totalTokens / totals.events : 0,
        activeDays: dailyUsage.length,
        tokensPerSecond: speedTokensPerSecond(overallSpeed),
        avgTtftMs: speedAvgTtftMs(overallSpeed),
        timedEvents: events.filter((event) => event.genDurationMs != null).length,
      },
      dailyUsage,
      modelBreakdown,
      recentEvents,
      availableModels: modelBreakdown.map((item) => ({
        id: item.model,
        label: item.label,
      })),
      dateBounds: {
        firstEventAt: events[0]?.createdAt.toISOString() ?? null,
        lastEventAt: events.at(-1)?.createdAt.toISOString() ?? null,
      },
    };
  });
