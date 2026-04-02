import { prisma } from "#/db";
import { logger } from "#/lib/logger";
import { parsePreferences } from "#/lib/preferences";
import { getLastSyncTime, writeFeedCache } from "./cache";
import { fetchAndParseIcal } from "./ical-parser";
import type { CalendarFeed } from "./types";

/**
 * Sync all calendar feeds that are due based on their configured interval.
 * Called by the system task scheduler.
 */
export async function syncCalendarFeeds(): Promise<void> {
  // Get all users' calendar feeds from preferences
  const users = await prisma.user.findMany({
    select: { id: true, preferences: true },
  });

  let totalSynced = 0;
  let totalFeeds = 0;
  let skippedNotDue = 0;

  for (const user of users) {
    const prefs = parsePreferences(user.preferences);
    const feeds = prefs.calendarFeeds;
    if (!feeds || feeds.length === 0) continue;

    for (const feed of feeds) {
      totalFeeds++;
      try {
        if (!isSyncDue(user.id, feed)) {
          skippedNotDue++;
          continue;
        }

        logger.info({ feedId: feed.id, feedName: feed.name, feedUrl: feed.url }, "Syncing calendar feed");
        const events = await fetchAndParseIcal(feed);

        writeFeedCache(user.id, {
          feedId: feed.id,
          feedName: feed.name,
          lastSyncedAt: new Date().toISOString(),
          events,
        });

        totalSynced++;
        logger.info({ feedId: feed.id, eventCount: events.length }, "Calendar feed synced");
      } catch (err) {
        logger.error({ feedId: feed.id, feedName: feed.name, feedUrl: feed.url, err }, "Failed to sync calendar feed");
      }
    }
  }

  logger.debug({ totalFeeds, totalSynced, skippedNotDue }, "Calendar sync cycle complete");
}

function isSyncDue(userId: string, feed: CalendarFeed): boolean {
  const lastSync = getLastSyncTime(userId, feed.id);
  if (!lastSync) return true;

  const minutesSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60);
  return minutesSinceSync >= feed.syncInterval;
}
