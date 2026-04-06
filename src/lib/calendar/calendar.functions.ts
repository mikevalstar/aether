import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureSession } from "#/lib/auth.functions";
import { getUserPreference } from "#/lib/preferences.server";
import { getAllCachedEvents, queryEvents, writeFeedCache } from "./cache";
import { fetchAndParseIcal } from "./ical-parser";
import type { CalendarEvent } from "./types";

const calendarEventsInputSchema = z
  .object({
    startDate: z.string().trim().min(1),
    endDate: z.string().trim().min(1),
  })
  .strict();

const calendarMonthInputSchema = z
  .object({
    year: z.coerce.number().int().min(1970).max(9999),
    month: z.coerce.number().int().min(0).max(11),
  })
  .strict();

export const getCalendarEvents = createServerFn({ method: "GET" })
  .inputValidator((data) => calendarEventsInputSchema.parse(data))
  .handler(async ({ data }): Promise<CalendarEvent[]> => {
    const session = await ensureSession();
    return queryEvents(session.user.id, data.startDate, data.endDate);
  });

export const getCalendarEventsForMonth = createServerFn({ method: "GET" })
  .inputValidator((data) => calendarMonthInputSchema.parse(data))
  .handler(async ({ data }): Promise<CalendarEvent[]> => {
    const session = await ensureSession();
    const start = new Date(data.year, data.month, 1);
    const end = new Date(data.year, data.month + 1, 0, 23, 59, 59);
    return queryEvents(session.user.id, start.toISOString(), end.toISOString());
  });

export const getAllCalendarEvents = createServerFn({ method: "GET" }).handler(async (): Promise<CalendarEvent[]> => {
  const session = await ensureSession();
  return getAllCachedEvents(session.user.id);
});

export type FeedSyncResult = {
  feedId: string;
  feedName: string;
  success: boolean;
  eventCount?: number;
  error?: string;
};

export const syncCalendarFeedsNow = createServerFn({ method: "POST" }).handler(async (): Promise<FeedSyncResult[]> => {
  const session = await ensureSession();
  const feeds = await getUserPreference(session.user.id, "calendarFeeds");
  if (!feeds || feeds.length === 0) return [];

  const results: FeedSyncResult[] = [];

  for (const feed of feeds) {
    try {
      const events = await fetchAndParseIcal(feed);
      writeFeedCache(session.user.id, {
        feedId: feed.id,
        feedName: feed.name,
        lastSyncedAt: new Date().toISOString(),
        events,
      });
      results.push({ feedId: feed.id, feedName: feed.name, success: true, eventCount: events.length });
    } catch (err) {
      results.push({
        feedId: feed.id,
        feedName: feed.name,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return results;
});
