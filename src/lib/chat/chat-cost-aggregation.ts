import { prisma } from "#/db";
import { type ChatModel, type ChatUsageTotals, resolveModelId } from "#/lib/chat/chat";

export type CostBreakdown = {
  /** Totals for just the parent thread (no sub-agents). */
  parent: ChatUsageTotals;
  /** Sum across all sub-agent threads. `count` is the number of sub-agent runs. */
  subAgents: ChatUsageTotals & { count: number };
  /** parent + subAgents. */
  aggregate: ChatUsageTotals;
  /**
   * Per-model rows aggregated across parent and sub-agents. Sorted by cost desc.
   * The `model` field is a canonical ChatModel id when we can resolve it,
   * otherwise the raw string stored on the usage event.
   */
  byModel: Array<
    ChatUsageTotals & {
      model: ChatModel | string;
    }
  >;
};

function emptyTotals(): ChatUsageTotals {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUsd: 0 };
}

function addTotals(left: ChatUsageTotals, right: Partial<ChatUsageTotals>): ChatUsageTotals {
  const inputTokens = left.inputTokens + (right.inputTokens ?? 0);
  const outputTokens = left.outputTokens + (right.outputTokens ?? 0);
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCostUsd: left.estimatedCostUsd + (right.estimatedCostUsd ?? 0),
  };
}

type Event = {
  threadId: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
};

/**
 * Build a cost breakdown for the given parent thread: parent-only, sub-agents
 * sum, aggregate, and a per-model table. Queries `ChatUsageEvent` directly so
 * per-model numbers stay accurate even when the parent thread switches models.
 */
export async function getCostBreakdownForThread(parentThreadId: string, userId: string): Promise<CostBreakdown> {
  const subAgentThreads = await prisma.chatThread.findMany({
    where: { parentThreadId, userId },
    select: { id: true },
  });
  const subAgentIds = new Set(subAgentThreads.map((t) => t.id));
  const threadIds = [parentThreadId, ...subAgentIds];

  const events = await prisma.chatUsageEvent.findMany({
    where: { userId, threadId: { in: threadIds } },
    select: { threadId: true, model: true, inputTokens: true, outputTokens: true, estimatedCostUsd: true },
  });

  return buildBreakdown(parentThreadId, subAgentIds, events);
}

/**
 * Batched variant: returns a `parentThreadId → CostBreakdown` map in a single
 * pair of queries. Use when rendering lists of thread rows (run history,
 * activity log) so cost displays can reflect aggregate cost without an N+1.
 */
export async function getCostBreakdownsForThreads(
  parentThreadIds: string[],
  userId: string,
): Promise<Map<string, CostBreakdown>> {
  const out = new Map<string, CostBreakdown>();
  if (parentThreadIds.length === 0) return out;

  const subAgentThreads = await prisma.chatThread.findMany({
    where: { userId, parentThreadId: { in: parentThreadIds } },
    select: { id: true, parentThreadId: true },
  });

  // Map sub-agent thread id → parent thread id so we can route events back.
  const subAgentToParent = new Map<string, string>();
  const parentToSubIds = new Map<string, Set<string>>();
  for (const id of parentThreadIds) parentToSubIds.set(id, new Set());
  for (const t of subAgentThreads) {
    if (!t.parentThreadId) continue;
    subAgentToParent.set(t.id, t.parentThreadId);
    parentToSubIds.get(t.parentThreadId)?.add(t.id);
  }

  const allThreadIds = [...parentThreadIds, ...subAgentToParent.keys()];
  const events = await prisma.chatUsageEvent.findMany({
    where: { userId, threadId: { in: allThreadIds } },
    select: { threadId: true, model: true, inputTokens: true, outputTokens: true, estimatedCostUsd: true },
  });

  // Bucket events by parent thread id (a sub-agent event's threadId maps back
  // to its parent via subAgentToParent).
  const eventsByParent = new Map<string, Event[]>();
  for (const id of parentThreadIds) eventsByParent.set(id, []);
  for (const e of events) {
    if (!e.threadId) continue;
    const parentId = parentThreadIds.includes(e.threadId) ? e.threadId : subAgentToParent.get(e.threadId);
    if (!parentId) continue;
    eventsByParent.get(parentId)?.push(e);
  }

  for (const parentId of parentThreadIds) {
    const subIds = parentToSubIds.get(parentId) ?? new Set<string>();
    out.set(parentId, buildBreakdown(parentId, subIds, eventsByParent.get(parentId) ?? []));
  }

  return out;
}

function buildBreakdown(parentId: string, subAgentIds: Set<string>, events: Event[]): CostBreakdown {
  let parent = emptyTotals();
  let subAgents = emptyTotals();
  let subCount = 0;
  const byModelMap = new Map<string, ChatUsageTotals>();

  for (const e of events) {
    const row = { inputTokens: e.inputTokens, outputTokens: e.outputTokens, estimatedCostUsd: e.estimatedCostUsd };
    if (e.threadId === parentId) {
      parent = addTotals(parent, row);
    } else if (e.threadId && subAgentIds.has(e.threadId)) {
      subAgents = addTotals(subAgents, row);
    }

    const modelKey = resolveModelId(e.model) ?? e.model;
    const prev = byModelMap.get(modelKey) ?? emptyTotals();
    byModelMap.set(modelKey, addTotals(prev, row));
  }

  // Sub-agent count = distinct sub-agent thread ids that actually had events.
  const subThreadsWithEvents = new Set<string>();
  for (const e of events) {
    if (e.threadId && subAgentIds.has(e.threadId)) subThreadsWithEvents.add(e.threadId);
  }
  subCount = subThreadsWithEvents.size;

  const aggregate = addTotals(parent, subAgents);

  const byModel = [...byModelMap.entries()]
    .map(([model, totals]) => ({ model, ...totals }))
    .sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd);

  return {
    parent,
    subAgents: { ...subAgents, count: subCount },
    aggregate,
    byModel,
  };
}
