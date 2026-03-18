import { prisma } from "#/db";
import { logger } from "#/lib/logger";
import { parsePreferences } from "#/lib/preferences";
import { sendPushover } from "#/lib/pushover";

export type NotificationLevel = "silent" | "notify" | "push";

export function isNotificationLevel(value: unknown): value is NotificationLevel {
  return value === "silent" || value === "notify" || value === "push";
}

type NotifyParams = {
  userId: string;
  title: string;
  body?: string;
  link?: string;
  pushToPhone?: boolean;
};

export async function notify({ userId, title, body, link, pushToPhone = false }: NotifyParams) {
  const notification = await prisma.notification.create({
    data: {
      title,
      body,
      link,
      pushToPhone,
      userId,
    },
  });

  if (pushToPhone) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true },
      });

      const prefs = parsePreferences(user?.preferences);
      if (prefs.pushoverUserKey) {
        const appUrl = process.env.APP_URL || "http://localhost:3000";
        const pushed = await sendPushover({
          userKey: prefs.pushoverUserKey,
          title,
          message: body || title,
          url: link ? `${appUrl}${link}` : undefined,
          urlTitle: link ? "Open in Aether" : undefined,
        });

        if (pushed) {
          await prisma.notification.update({
            where: { id: notification.id },
            data: { pushedAt: new Date() },
          });
        }
      }
    } catch (err) {
      logger.warn({ err, notificationId: notification.id }, "Failed to send push notification");
    }
  }

  return notification;
}
