import { tool } from "ai";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { z } from "zod";
import { prisma } from "#/db";
import { notify } from "#/lib/notify";

dayjs.extend(utc);
dayjs.extend(timezone);

export function createSendNotification(userId: string, userTimezone?: string) {
  const defaultTz = userTimezone || process.env.DEFAULT_TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;

  return tool({
    description:
      "Send a notification to the user. Use this only when the user explicitly asks to be notified or reminded about something, or when you encounter something genuinely important that warrants their attention. Do not use this for routine messages — prefer responding in the conversation instead. Set pushToPhone to true only for urgent matters or when the user specifically requests a phone notification. Use the level parameter to indicate severity — info for routine, medium for notable, high for important, critical for urgent. To schedule a notification for later (e.g. a reminder at a specific time), set scheduledAt to an ISO 8601 date-time and optionally timezone (IANA name). When scheduledAt is omitted, the notification is delivered immediately.",
    inputSchema: z.object({
      title: z.string().describe("Short notification title"),
      body: z.string().optional().describe("Optional longer description"),
      link: z.string().optional().describe("Optional relative app URL to link to (e.g. /chat, /tasks)"),
      level: z
        .enum(["info", "low", "medium", "high", "critical"])
        .default("low")
        .describe(
          "Notification severity level. Use low for routine, medium for notable, high for important, critical for urgent.",
        ),
      pushToPhone: z
        .boolean()
        .default(false)
        .describe("Whether to also send as a push notification to the user's phone. Only for urgent matters."),
      scheduledAt: z
        .string()
        .optional()
        .describe(
          "Optional ISO 8601 date-time when the notification should be delivered. If it has no timezone offset, the timezone parameter (or the user's default) is applied. Omit to send immediately.",
        ),
      timezone: z
        .string()
        .optional()
        .describe(
          "Optional IANA timezone name (e.g. 'America/Toronto') used to interpret scheduledAt when it has no explicit offset. Defaults to the user's current timezone.",
        ),
    }),
    execute: async ({ title, body, link, level, pushToPhone, scheduledAt, timezone: tzArg }) => {
      // Immediate delivery path
      if (!scheduledAt) {
        await notify({ userId, title, body, link, level, category: "ai", pushToPhone });

        await prisma.activityLog.create({
          data: {
            type: "ai_notification",
            summary: `AI sent notification: ${title}`,
            metadata: JSON.stringify({ title, body, link, level, pushToPhone }),
            userId,
          },
        });

        return { sent: true, scheduled: false, title, level, pushToPhone };
      }

      // Scheduled delivery path
      const tz = tzArg || defaultTz;

      // Try parsing as ISO with offset first; if that fails, interpret it in the given timezone.
      let when = dayjs(scheduledAt);
      const hasExplicitOffset = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(scheduledAt);
      if (!when.isValid() || !hasExplicitOffset) {
        when = dayjs.tz(scheduledAt, tz);
      }

      if (!when.isValid()) {
        return {
          sent: false,
          scheduled: false,
          error: `Could not parse scheduledAt "${scheduledAt}". Use ISO 8601 format like 2026-04-10T15:30:00.`,
        };
      }

      if (when.valueOf() <= Date.now()) {
        // Past-time schedule — just send immediately instead of scheduling.
        await notify({ userId, title, body, link, level, category: "ai", pushToPhone });

        await prisma.activityLog.create({
          data: {
            type: "ai_notification",
            summary: `AI sent notification (requested past time): ${title}`,
            metadata: JSON.stringify({ title, body, link, level, pushToPhone, requestedAt: scheduledAt }),
            userId,
          },
        });

        return {
          sent: true,
          scheduled: false,
          title,
          level,
          pushToPhone,
          note: "Requested time is in the past — sent immediately.",
        };
      }

      const scheduled = await prisma.scheduledNotification.create({
        data: {
          title,
          body,
          link,
          level,
          category: "ai",
          source: "ai",
          pushToPhone,
          scheduledAt: when.toDate(),
          timezone: tz,
          userId,
        },
      });

      await prisma.activityLog.create({
        data: {
          type: "ai_notification_scheduled",
          summary: `AI scheduled notification: ${title}`,
          metadata: JSON.stringify({
            scheduledNotificationId: scheduled.id,
            title,
            body,
            link,
            level,
            pushToPhone,
            scheduledAt: when.toISOString(),
            timezone: tz,
          }),
          userId,
        },
      });

      return {
        sent: false,
        scheduled: true,
        id: scheduled.id,
        title,
        level,
        pushToPhone,
        scheduledAt: when.toISOString(),
        scheduledAtLocal: when.tz(tz).format("YYYY-MM-DD HH:mm"),
        timezone: tz,
      };
    },
  });
}
