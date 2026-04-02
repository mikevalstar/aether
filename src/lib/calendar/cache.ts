import fs from "node:fs";
import path from "node:path";
import { logger } from "#/lib/logger";
import type { CachedFeedData, CalendarEvent } from "./types";

const BASE_CACHE_DIR = path.resolve("data/calendars");

/** One-time migration: remove global (non-user-scoped) cache files from the old layout. */
function migrateGlobalCache() {
  if (!fs.existsSync(BASE_CACHE_DIR)) return;
  const entries = fs.readdirSync(BASE_CACHE_DIR).filter((f) => f.endsWith(".json"));
  for (const file of entries) {
    const filePath = path.join(BASE_CACHE_DIR, file);
    try {
      fs.unlinkSync(filePath);
      logger.info({ file }, "Removed global calendar cache file (migrated to per-user)");
    } catch (err) {
      logger.warn({ file, err }, "Failed to remove global calendar cache file");
    }
  }
}

let migrated = false;

function userCacheDir(userId: string): string {
  return path.join(BASE_CACHE_DIR, userId);
}

function ensureUserCacheDir(userId: string) {
  if (!migrated) {
    migrateGlobalCache();
    migrated = true;
  }
  const dir = userCacheDir(userId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function feedCachePath(userId: string, feedId: string): string {
  return path.join(userCacheDir(userId), `${feedId}.json`);
}

export function writeFeedCache(userId: string, data: CachedFeedData): void {
  ensureUserCacheDir(userId);
  fs.writeFileSync(feedCachePath(userId, data.feedId), JSON.stringify(data, null, 2), "utf-8");
}

export function readFeedCache(userId: string, feedId: string): CachedFeedData | null {
  const filePath = feedCachePath(userId, feedId);
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as CachedFeedData;
  } catch (err) {
    logger.warn({ feedId, err }, "Failed to read calendar feed cache");
    return null;
  }
}

export function deleteFeedCache(userId: string, feedId: string): void {
  const filePath = feedCachePath(userId, feedId);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function getLastSyncTime(userId: string, feedId: string): Date | null {
  const cached = readFeedCache(userId, feedId);
  if (!cached?.lastSyncedAt) return null;
  return new Date(cached.lastSyncedAt);
}

/**
 * Query cached events for a specific user across their feeds for a given date range.
 */
export function queryEvents(userId: string, startDate: string, endDate: string): CalendarEvent[] {
  ensureUserCacheDir(userId);
  const start = new Date(startDate);
  const end = new Date(endDate);
  const allEvents: CalendarEvent[] = [];
  const dir = userCacheDir(userId);

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const data = JSON.parse(raw) as CachedFeedData;

      for (const event of data.events) {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);

        // Include events that overlap with the query range
        if (eventEnd >= start && eventStart <= end) {
          allEvents.push(event);
        }
      }
    } catch (err) {
      logger.warn({ file, err }, "Skipping corrupted calendar cache file");
    }
  }

  return allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

/**
 * Get all cached events for a specific user across their feeds (for dashboard use).
 */
export function getAllCachedEvents(userId: string): CalendarEvent[] {
  ensureUserCacheDir(userId);
  const allEvents: CalendarEvent[] = [];
  const dir = userCacheDir(userId);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const data = JSON.parse(raw) as CachedFeedData;
      allEvents.push(...data.events);
    } catch (err) {
      logger.warn({ file, err }, "Skipping corrupted calendar cache file");
    }
  }

  return allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}
