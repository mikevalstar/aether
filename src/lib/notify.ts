import { prisma } from "#/db";
import { logger } from "#/lib/logger";
import { getUserPreferences } from "#/lib/preferences.server";
import { sendPushover } from "#/lib/pushover";

/** Notification severity levels — controls importance and visibility */
export type NotificationSeverity = "info" | "low" | "medium" | "high" | "critical" | "error";

export const NOTIFICATION_SEVERITIES: NotificationSeverity[] = ["info", "low", "medium", "high", "critical", "error"];

const SEVERITY_ORDER: Record<NotificationSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
  error: 5,
};

export function isNotificationSeverity(value: unknown): value is NotificationSeverity {
  return typeof value === "string" && value in SEVERITY_ORDER;
}

/** Compare severity levels — returns true if `level` >= `minLevel` */
export function severityMeetsThreshold(level: NotificationSeverity, minLevel: NotificationSeverity): boolean {
  return SEVERITY_ORDER[level] >= SEVERITY_ORDER[minLevel];
}

/** Delivery behavior — whether to create a notification and/or push */
export type NotificationDelivery = "silent" | "notify" | "push";

export function isNotificationDelivery(value: unknown): value is NotificationDelivery {
  return value === "silent" || value === "notify" || value === "push";
}

// Backward compatibility aliases
/** @deprecated Use NotificationDelivery instead */
export type NotificationLevel = NotificationDelivery;
/** @deprecated Use isNotificationDelivery instead */
export const isNotificationLevel = isNotificationDelivery;

type NotifyParams = {
  userId: string;
  title: string;
  body?: string;
  link?: string;
  level?: NotificationSeverity;
  category?: string;
  source?: string;
  pushToPhone?: boolean;
};

export async function notify({
  userId,
  title,
  body,
  link,
  level = "info",
  category,
  source,
  pushToPhone = false,
}: NotifyParams) {
  // Determine if push should be sent based on user preferences
  let shouldPush = pushToPhone;
  let prefs = {} as Awaited<ReturnType<typeof getUserPreferences>>;

  if (pushToPhone || level !== "info") {
    try {
      prefs = await getUserPreferences(userId);
    } catch (err) {
      logger.warn({ err }, "Failed to load user notification preferences");
    }
  }

  if (!shouldPush && level !== "info") {
    const minLevel = prefs.pushNotificationMinLevel ?? "critical";
    if (isNotificationSeverity(minLevel) && severityMeetsThreshold(level, minLevel)) {
      shouldPush = true;
    }
  }

  const notification = await prisma.notification.create({
    data: {
      title,
      body,
      link,
      level,
      category,
      source,
      pushToPhone: shouldPush,
      userId,
    },
  });

  if (shouldPush) {
    try {
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

/**
 * Send a notification to multiple users by email address.
 * "all" targets all users. Filters to only the specified emails otherwise.
 */
export async function notifyUsers(params: Omit<NotifyParams, "userId"> & { emails: string[] }) {
  const { emails, ...rest } = params;

  let users: { id: string }[];
  if (emails.length === 1 && emails[0] === "all") {
    users = await prisma.user.findMany({ select: { id: true } });
  } else {
    users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
  }

  const results = await Promise.allSettled(users.map((user) => notify({ ...rest, userId: user.id })));

  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    logger.warn({ failureCount: failures.length }, "Some user notifications failed");
  }

  return { sent: users.length, failed: failures.length };
}
