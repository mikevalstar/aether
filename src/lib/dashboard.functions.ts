import { createServerFn } from "@tanstack/react-start";
import dayjs from "dayjs";
import { prisma } from "#/db";
import { ensureSession } from "#/lib/auth.functions";
import { getChatPreviewFromMessages, parseStoredMessages } from "#/lib/chat";
import { DEFAULT_CHAT_MODEL, resolveModelId } from "#/lib/chat-models";
import { getChatModelLabel } from "#/lib/chat-usage";

export type DashboardThread = {
  id: string;
  title: string;
  preview: string;
  model: string;
  updatedAt: string;
};

export type DashboardActivity = {
  id: string;
  type: string;
  summary: string;
  createdAt: string;
};

export type DashboardUsage = {
  todayCostUsd: number;
  todayEvents: number;
  weekCostUsd: number;
  weekEvents: number;
};

export type DashboardNotification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  level: string;
  category: string | null;
  read: boolean;
  createdAt: string;
};

export type DashboardNotificationSummary = {
  items: DashboardNotification[];
  counts: Record<string, number>;
  unreadTotal: number;
};

export type DashboardData = {
  recentThreads: DashboardThread[];
  recentActivity: DashboardActivity[];
  usage: DashboardUsage;
  notifications: DashboardNotificationSummary;
};

export const getDashboardData = createServerFn({ method: "GET" }).handler(async (): Promise<DashboardData> => {
  const session = await ensureSession();
  const userId = session.user.id;

  const todayStart = dayjs().startOf("day").toDate();
  const weekStart = dayjs().subtract(7, "day").startOf("day").toDate();

  const [threads, activity, todayUsage, weekUsage, recentNotifications, unreadNotificationCounts] = await Promise.all([
    prisma.chatThread.findMany({
      where: { userId, type: "chat" },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.chatUsageEvent.aggregate({
      where: { userId, createdAt: { gte: todayStart } },
      _sum: { estimatedCostUsd: true },
      _count: true,
    }),
    prisma.chatUsageEvent.aggregate({
      where: { userId, createdAt: { gte: weekStart } },
      _sum: { estimatedCostUsd: true },
      _count: true,
    }),
    prisma.notification.findMany({
      where: { userId, archived: false },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.notification.groupBy({
      by: ["level"],
      where: { userId, read: false, archived: false },
      _count: true,
    }),
  ]);

  return {
    recentThreads: threads.map((t) => {
      const messages = parseStoredMessages(t.messagesJson);
      const model = resolveModelId(t.model) ?? DEFAULT_CHAT_MODEL;
      return {
        id: t.id,
        title: t.title,
        preview: getChatPreviewFromMessages(messages),
        model: getChatModelLabel(model),
        updatedAt: t.updatedAt.toISOString(),
      };
    }),
    recentActivity: activity.map((a) => ({
      id: a.id,
      type: a.type,
      summary: a.summary,
      createdAt: a.createdAt.toISOString(),
    })),
    usage: {
      todayCostUsd: todayUsage._sum.estimatedCostUsd ?? 0,
      todayEvents: todayUsage._count,
      weekCostUsd: weekUsage._sum.estimatedCostUsd ?? 0,
      weekEvents: weekUsage._count,
    },
    notifications: {
      items: recentNotifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        link: n.link,
        level: n.level,
        category: n.category,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      })),
      counts: Object.fromEntries(unreadNotificationCounts.map((g) => [g.level, g._count])),
      unreadTotal: unreadNotificationCounts.reduce((sum, g) => sum + g._count, 0),
    },
  };
});
