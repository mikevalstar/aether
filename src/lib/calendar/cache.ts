import fs from "node:fs";
import path from "node:path";
import { logger } from "#/lib/logger";
import type { CachedFeedData, CalendarEvent } from "./types";

const CACHE_DIR = path.resolve("data/calendars");

function ensureCacheDir() {
	if (!fs.existsSync(CACHE_DIR)) {
		fs.mkdirSync(CACHE_DIR, { recursive: true });
	}
}

function feedCachePath(feedId: string): string {
	return path.join(CACHE_DIR, `${feedId}.json`);
}

export function writeFeedCache(data: CachedFeedData): void {
	ensureCacheDir();
	fs.writeFileSync(feedCachePath(data.feedId), JSON.stringify(data, null, 2), "utf-8");
}

export function readFeedCache(feedId: string): CachedFeedData | null {
	const filePath = feedCachePath(feedId);
	if (!fs.existsSync(filePath)) return null;

	try {
		const raw = fs.readFileSync(filePath, "utf-8");
		return JSON.parse(raw) as CachedFeedData;
	} catch (err) {
		logger.warn({ feedId, err }, "Failed to read calendar feed cache");
		return null;
	}
}

export function deleteFeedCache(feedId: string): void {
	const filePath = feedCachePath(feedId);
	if (fs.existsSync(filePath)) {
		fs.unlinkSync(filePath);
	}
}

export function getLastSyncTime(feedId: string): Date | null {
	const cached = readFeedCache(feedId);
	if (!cached?.lastSyncedAt) return null;
	return new Date(cached.lastSyncedAt);
}

/**
 * Query cached events across all feeds for a given date range.
 */
export function queryEvents(startDate: string, endDate: string): CalendarEvent[] {
	ensureCacheDir();
	const start = new Date(startDate);
	const end = new Date(endDate);
	const allEvents: CalendarEvent[] = [];

	const files = fs.readdirSync(CACHE_DIR).filter((f) => f.endsWith(".json"));

	for (const file of files) {
		try {
			const raw = fs.readFileSync(path.join(CACHE_DIR, file), "utf-8");
			const data = JSON.parse(raw) as CachedFeedData;

			for (const event of data.events) {
				const eventStart = new Date(event.start);
				const eventEnd = new Date(event.end);

				// Include events that overlap with the query range
				if (eventEnd >= start && eventStart <= end) {
					allEvents.push(event);
				}
			}
		} catch {
			// Skip corrupted cache files
		}
	}

	return allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

/**
 * Get all cached events across all feeds (for dashboard use).
 */
export function getAllCachedEvents(): CalendarEvent[] {
	ensureCacheDir();
	const allEvents: CalendarEvent[] = [];
	const files = fs.readdirSync(CACHE_DIR).filter((f) => f.endsWith(".json"));

	for (const file of files) {
		try {
			const raw = fs.readFileSync(path.join(CACHE_DIR, file), "utf-8");
			const data = JSON.parse(raw) as CachedFeedData;
			allEvents.push(...data.events);
		} catch {
			// Skip corrupted cache files
		}
	}

	return allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}
