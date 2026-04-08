import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "#/db";
import { ensureSession } from "#/lib/auth.functions";

const listInputSchema = z
  .object({
    status: z.enum(["pending", "sent", "cancelled", "failed", "all"]).optional(),
  })
  .strict();

const cancelInputSchema = z
  .object({
    id: z.string().trim().min(1, "Scheduled notification ID is required"),
  })
  .strict();

export type ScheduledNotificationItem = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  level: string;
  category: string | null;
  pushToPhone: boolean;
  scheduledAt: string;
  timezone: string | null;
  status: string;
  sentAt: string | null;
  cancelledAt: string | null;
  attempts: number;
  lastError: string | null;
  createdAt: string;
};

export type ScheduledNotificationListResult = {
  items: ScheduledNotificationItem[];
  counts: {
    pending: number;
    sent: number;
    cancelled: number;
    failed: number;
  };
};

export const getScheduledNotifications = createServerFn({ method: "GET" })
  .inputValidator((data) => listInputSchema.parse(data ?? {}))
  .handler(async ({ data }): Promise<ScheduledNotificationListResult> => {
    const session = await ensureSession();
    const status = data.status ?? "pending";

    const where = {
      userId: session.user.id,
      ...(status === "all" ? {} : { status }),
    };

    const [items, grouped] = await Promise.all([
      prisma.scheduledNotification.findMany({
        where,
        orderBy: [{ status: "asc" }, { scheduledAt: "asc" }],
        take: 200,
      }),
      prisma.scheduledNotification.groupBy({
        by: ["status"],
        where: { userId: session.user.id },
        _count: { _all: true },
      }),
    ]);

    const counts = { pending: 0, sent: 0, cancelled: 0, failed: 0 };
    for (const g of grouped) {
      if (g.status in counts) {
        counts[g.status as keyof typeof counts] = g._count._all;
      }
    }

    return {
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        link: item.link,
        level: item.level,
        category: item.category,
        pushToPhone: item.pushToPhone,
        scheduledAt: item.scheduledAt.toISOString(),
        timezone: item.timezone,
        status: item.status,
        sentAt: item.sentAt?.toISOString() ?? null,
        cancelledAt: item.cancelledAt?.toISOString() ?? null,
        attempts: item.attempts,
        lastError: item.lastError,
        createdAt: item.createdAt.toISOString(),
      })),
      counts,
    };
  });

export const cancelScheduledNotification = createServerFn({ method: "POST" })
  .inputValidator((data) => cancelInputSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const existing = await prisma.scheduledNotification.findFirst({
      where: { id: data.id, userId: session.user.id },
    });

    if (!existing) {
      return { success: false as const, error: "Scheduled notification not found" };
    }

    if (existing.status !== "pending") {
      return {
        success: false as const,
        error: `Cannot cancel — status is ${existing.status}`,
      };
    }

    await prisma.scheduledNotification.update({
      where: { id: existing.id },
      data: { status: "cancelled", cancelledAt: new Date() },
    });

    return { success: true as const };
  });
