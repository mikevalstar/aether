/**
 * Read-only Prisma queries used by the debug CLI.
 *
 * Kept as plain async functions (no caching, no server-fn wrappers) so the CLI
 * can call them directly without dragging in TanStack Start request context.
 */

import { prisma } from "#/db";

export type ListOpts = {
  userId?: string;
  limit?: number;
};

export async function getFirstAdminUser() {
  return prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true },
  });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, name: true, role: true },
  });
}

export type UserWithPlugins = {
  id: string;
  email: string;
  name: string;
  role: string;
  banned: boolean;
  emailVerified: boolean;
  createdAt: Date;
  enabledPlugins: string[];
  defaultChatModel: string | null;
  timezone: string | null;
};

/**
 * List all users with role + enabled plugins (parsed from `User.preferences` JSON).
 * Sorted with admins first, then by email. Falls back gracefully if a user's
 * preferences JSON is malformed.
 */
export async function listUsersWithPlugins(): Promise<UserWithPlugins[]> {
  const rows = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      banned: true,
      emailVerified: true,
      createdAt: true,
      preferences: true,
    },
    orderBy: [{ role: "desc" }, { email: "asc" }],
  });

  return rows.map((user) => {
    let enabledPlugins: string[] = [];
    let defaultChatModel: string | null = null;
    let timezone: string | null = null;
    try {
      const parsed = JSON.parse(user.preferences) as {
        enabledPlugins?: unknown;
        defaultChatModel?: unknown;
        timezone?: unknown;
      };
      if (Array.isArray(parsed.enabledPlugins)) {
        enabledPlugins = parsed.enabledPlugins.filter((v): v is string => typeof v === "string");
      }
      if (typeof parsed.defaultChatModel === "string") defaultChatModel = parsed.defaultChatModel;
      if (typeof parsed.timezone === "string") timezone = parsed.timezone;
    } catch {
      // Malformed preferences JSON — surface empty plugin list instead of crashing.
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      banned: user.banned,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      enabledPlugins,
      defaultChatModel,
      timezone,
    };
  });
}

// ── Tasks / Workflows / Triggers ──────────────────────────────────────────

export async function listTasks(opts: ListOpts = {}) {
  return prisma.task.findMany({
    where: opts.userId ? { userId: opts.userId } : undefined,
    orderBy: [{ enabled: "desc" }, { lastRunAt: { sort: "desc", nulls: "last" } }],
    take: opts.limit,
  });
}

export async function listWorkflows(opts: ListOpts = {}) {
  return prisma.workflow.findMany({
    where: opts.userId ? { userId: opts.userId } : undefined,
    orderBy: { lastRunAt: { sort: "desc", nulls: "last" } },
    take: opts.limit,
  });
}

export async function listTriggers(opts: ListOpts = {}) {
  return prisma.trigger.findMany({
    where: opts.userId ? { userId: opts.userId } : undefined,
    orderBy: [{ enabled: "desc" }, { lastFiredAt: { sort: "desc", nulls: "last" } }],
    take: opts.limit,
  });
}

// ── Chat ─────────────────────────────────────────────────────────────────

export async function listChatThreads(opts: ListOpts = {}) {
  return prisma.chatThread.findMany({
    where: opts.userId ? { userId: opts.userId } : undefined,
    orderBy: { updatedAt: "desc" },
    take: opts.limit ?? 20,
    select: {
      id: true,
      title: true,
      type: true,
      model: true,
      effort: true,
      totalInputTokens: true,
      totalOutputTokens: true,
      totalEstimatedCostUsd: true,
      sourceTaskFile: true,
      sourceWorkflowFile: true,
      sourceTriggerFile: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
    },
  });
}

export async function getChatThread(id: string) {
  return prisma.chatThread.findUnique({
    where: { id },
  });
}

// ── Usage aggregation ────────────────────────────────────────────────────

export type UsageWindow = "today" | "week" | "month";

export function windowStart(window: UsageWindow): Date {
  const now = new Date();
  if (window === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (window === "week") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
}

export type UsageRow = {
  model: string;
  taskType: string;
  events: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
};

export async function aggregateUsage(window: UsageWindow, userId?: string): Promise<UsageRow[]> {
  const since = windowStart(window);
  const events = await prisma.chatUsageEvent.findMany({
    where: {
      ...(userId ? { userId } : {}),
      createdAt: { gte: since },
    },
    select: {
      model: true,
      taskType: true,
      inputTokens: true,
      outputTokens: true,
      totalTokens: true,
      estimatedCostUsd: true,
    },
  });

  const grouped = new Map<string, UsageRow>();
  for (const event of events) {
    const key = `${event.model}::${event.taskType}`;
    const existing = grouped.get(key) ?? {
      model: event.model,
      taskType: event.taskType,
      events: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
    };
    existing.events += 1;
    existing.inputTokens += event.inputTokens;
    existing.outputTokens += event.outputTokens;
    existing.totalTokens += event.totalTokens;
    existing.estimatedCostUsd += event.estimatedCostUsd;
    grouped.set(key, existing);
  }

  return [...grouped.values()].sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd);
}

// ── Activity ─────────────────────────────────────────────────────────────

export async function listActivity(opts: ListOpts & { type?: string } = {}) {
  return prisma.activityLog.findMany({
    where: {
      ...(opts.userId ? { userId: opts.userId } : {}),
      ...(opts.type ? { type: opts.type } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 50,
    include: { fileChangeDetail: true },
  });
}

// ── Notifications ────────────────────────────────────────────────────────

export type NotificationFilter = ListOpts & {
  unread?: boolean;
  level?: string;
};

export async function listNotifications(opts: NotificationFilter = {}) {
  return prisma.notification.findMany({
    where: {
      ...(opts.userId ? { userId: opts.userId } : {}),
      ...(opts.unread ? { read: false } : {}),
      ...(opts.level ? { level: opts.level } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 50,
  });
}
