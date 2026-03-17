export type CalendarFeed = {
	id: string;
	name: string;
	url: string;
	color: string;
	syncInterval: number; // minutes
};

export type CalendarEvent = {
	uid: string;
	title: string;
	description?: string;
	location?: string;
	start: string; // ISO 8601
	end: string; // ISO 8601
	allDay: boolean;
	recurrenceId?: string;
	calendarFeedId: string;
	calendarName: string;
	color: string;
};

export type CachedFeedData = {
	feedId: string;
	feedName: string;
	lastSyncedAt: string; // ISO 8601
	events: CalendarEvent[];
};
