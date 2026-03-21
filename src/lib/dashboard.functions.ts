import { createServerFn } from "@tanstack/react-start";
import dayjs from "dayjs";
import { prisma } from "#/db";
import { ensureSession } from "#/lib/auth.functions";
import { getChatPreviewFromMessages, parseStoredMessages } from "#/lib/chat";
import { DEFAULT_CHAT_MODEL, isChatModel } from "#/lib/chat-models";
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

export type DashboardData = {
  recentThreads: DashboardThread[];
  recentActivity: DashboardActivity[];
  usage: DashboardUsage;
};

export const getDashboardData = createServerFn({ method: "GET" }).handler(async (): Promise<DashboardData> => {
  const session = await ensureSession();
  const userId = session.user.id;

  const todayStart = dayjs().startOf("day").toDate();
  const weekStart = dayjs().subtract(7, "day").startOf("day").toDate();

  const [threads, activity, todayUsage, weekUsage] = await Promise.all([
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
  ]);

  return {
    recentThreads: threads.map((t) => {
      const messages = parseStoredMessages(t.messagesJson);
      const model = isChatModel(t.model) ? t.model : DEFAULT_CHAT_MODEL;
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
  };
});
