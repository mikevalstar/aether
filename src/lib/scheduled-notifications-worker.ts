import { prisma } from "#/db";
import { logger } from "#/lib/logger";
import { notify } from "#/lib/notify";

const MAX_ATTEMPTS = 5;
// How far back to still attempt delivery for missed schedules. We still
// attempt anything older than this, but mark it so it's visible in logs.
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Process any scheduled notifications whose delivery time has passed and
 * deliver them via notify(). This is fault-tolerant:
 *   - Picks up anything past "now" that hasn't been sent
 *   - Increments attempt count and records errors on failure
 *   - Gives up after MAX_ATTEMPTS and marks status=failed
 *   - Uses a "claim" pattern (single update) so two concurrent runs don't
 *     double-send the same notification
 */
export async function processDueScheduledNotifications(): Promise<{
  claimed: number;
  sent: number;
  failed: number;
}> {
  const now = new Date();

  const due = await prisma.scheduledNotification.findMany({
    where: {
      status: "pending",
      scheduledAt: { lte: now },
    },
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });

  if (due.length === 0) {
    return { claimed: 0, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  let claimed = 0;

  for (const item of due) {
    // Claim the row by doing a conditional update on status. If another
    // worker already claimed it, updateMany affects 0 rows and we skip.
    const claim = await prisma.scheduledNotification.updateMany({
      where: { id: item.id, status: "pending" },
      data: { attempts: { increment: 1 } },
    });

    if (claim.count === 0) continue;
    claimed += 1;

    const isStale = now.getTime() - item.scheduledAt.getTime() > STALE_THRESHOLD_MS;
    if (isStale) {
      logger.warn(
        {
          scheduledNotificationId: item.id,
          scheduledAt: item.scheduledAt.toISOString(),
          ageMs: now.getTime() - item.scheduledAt.getTime(),
        },
        "Delivering stale scheduled notification (missed its original time by more than 24h)",
      );
    }

    try {
      const notification = await notify({
        userId: item.userId,
        title: item.title,
        body: item.body ?? undefined,
        link: item.link ?? undefined,
        level: item.level as Parameters<typeof notify>[0]["level"],
        category: item.category ?? "ai",
        source: item.source ?? "scheduled",
        pushToPhone: item.pushToPhone,
      });

      await prisma.scheduledNotification.update({
        where: { id: item.id },
        data: {
          status: "sent",
          sentAt: new Date(),
          notificationId: notification.id,
          lastError: null,
        },
      });

      sent += 1;
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      logger.error(
        { scheduledNotificationId: item.id, err, attempts: item.attempts + 1 },
        "Failed to deliver scheduled notification",
      );

      const nextAttempts = item.attempts + 1;
      if (nextAttempts >= MAX_ATTEMPTS) {
        await prisma.scheduledNotification.update({
          where: { id: item.id },
          data: { status: "failed", lastError: message },
        });
      } else {
        // Leave it pending so the next tick retries.
        await prisma.scheduledNotification.update({
          where: { id: item.id },
          data: { status: "pending", lastError: message },
        });
      }
    }
  }

  if (sent > 0 || failed > 0) {
    logger.info({ claimed, sent, failed }, "Processed scheduled notifications");
  }

  return { claimed, sent, failed };
}
