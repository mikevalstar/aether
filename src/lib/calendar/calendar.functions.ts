import { createServerFn } from "@tanstack/react-start";
import { prisma } from "#/db";
import { ensureSession } from "#/lib/auth.functions";
import { parsePreferences } from "#/lib/preferences";
import { getAllCachedEvents, queryEvents, writeFeedCache } from "./cache";
import { fetchAndParseIcal } from "./ical-parser";
import type { CalendarEvent } from "./types";

export const getCalendarEvents = createServerFn({ method: "GET" })
	.inputValidator((data: { startDate: string; endDate: string }) => data)
	.handler(async ({ data }): Promise<CalendarEvent[]> => {
		await ensureSession();
		return queryEvents(data.startDate, data.endDate);
	});

export const getCalendarEventsForMonth = createServerFn({ method: "GET" })
	.inputValidator((data: { year: number; month: number }) => data)
	.handler(async ({ data }): Promise<CalendarEvent[]> => {
		await ensureSession();
		const start = new Date(data.year, data.month, 1);
		const end = new Date(data.year, data.month + 1, 0, 23, 59, 59);
		return queryEvents(start.toISOString(), end.toISOString());
	});

export const getAllCalendarEvents = createServerFn({ method: "GET" }).handler(async (): Promise<CalendarEvent[]> => {
	await ensureSession();
	return getAllCachedEvents();
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

	const user = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: { preferences: true },
	});

	const prefs = parsePreferences(user?.preferences);
	const feeds = prefs.calendarFeeds;
	if (!feeds || feeds.length === 0) return [];

	const results: FeedSyncResult[] = [];

	for (const feed of feeds) {
		try {
			const events = await fetchAndParseIcal(feed);
			writeFeedCache({
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
