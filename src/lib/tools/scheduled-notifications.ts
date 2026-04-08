import { tool } from "ai";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { z } from "zod";
import { prisma } from "#/db";

dayjs.extend(utc);
dayjs.extend(timezone);

export function createListScheduledNotifications(userId: string, userTimezone?: string) {
  const defaultTz = userTimezone || process.env.DEFAULT_TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;

  return tool({
    description:
      "List the user's upcoming scheduled notifications (reminders that have not yet been delivered). Useful when the user asks 'what reminders do I have' or before cancelling one. Returns id, title, scheduled time, level, and status.",
    inputSchema: z.object({
      limit: z.number().int().min(1).max(100).default(25).describe("Maximum number of scheduled notifications to return."),
      includeCompleted: z
        .boolean()
        .default(false)
        .describe("If true, also include sent/cancelled/failed notifications. Default is pending only."),
    }),
    execute: async ({ limit, includeCompleted }) => {
      const items = await prisma.scheduledNotification.findMany({
        where: {
          userId,
          ...(includeCompleted ? {} : { status: "pending" }),
        },
        orderBy: { scheduledAt: "asc" },
        take: limit,
        select: {
          id: true,
          title: true,
          body: true,
          link: true,
          level: true,
          pushToPhone: true,
          scheduledAt: true,
          timezone: true,
          status: true,
          sentAt: true,
          cancelledAt: true,
          attempts: true,
          lastError: true,
        },
      });

      return {
        timezone: defaultTz,
        count: items.length,
        items: items.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body ?? undefined,
          link: n.link ?? undefined,
          level: n.level,
          pushToPhone: n.pushToPhone,
          scheduledAt: n.scheduledAt.toISOString(),
          scheduledAtLocal: dayjs
            .utc(n.scheduledAt)
            .tz(n.timezone || defaultTz)
            .format("YYYY-MM-DD HH:mm"),
          timezone: n.timezone || defaultTz,
          status: n.status,
          ...(n.sentAt ? { sentAt: n.sentAt.toISOString() } : {}),
          ...(n.cancelledAt ? { cancelledAt: n.cancelledAt.toISOString() } : {}),
          ...(n.attempts ? { attempts: n.attempts } : {}),
          ...(n.lastError ? { lastError: n.lastError } : {}),
        })),
      };
    },
  });
}

export function createCancelScheduledNotification(userId: string) {
  return tool({
    description:
      "Cancel an upcoming scheduled notification by id. Use list_scheduled_notifications first if you don't already know the id. Only pending notifications can be cancelled.",
    inputSchema: z.object({
      id: z.string().describe("The id of the scheduled notification to cancel."),
    }),
    execute: async ({ id }) => {
      const existing = await prisma.scheduledNotification.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        return { cancelled: false, error: `No scheduled notification found with id "${id}".` };
      }

      if (existing.status !== "pending") {
        return {
          cancelled: false,
          error: `Scheduled notification is not pending (current status: ${existing.status}).`,
          id,
          status: existing.status,
        };
      }

      await prisma.scheduledNotification.update({
        where: { id },
        data: { status: "cancelled", cancelledAt: new Date() },
      });

      await prisma.activityLog.create({
        data: {
          type: "ai_notification_cancelled",
          summary: `AI cancelled scheduled notification: ${existing.title}`,
          metadata: JSON.stringify({
            scheduledNotificationId: id,
            title: existing.title,
            scheduledAt: existing.scheduledAt.toISOString(),
          }),
          userId,
        },
      });

      return {
        cancelled: true,
        id,
        title: existing.title,
        scheduledAt: existing.scheduledAt.toISOString(),
      };
    },
  });
}
