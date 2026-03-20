export type CalendarFeed = {
  id: string;
  name: string;
  url: string;
  color: string;
  syncInterval: number; // minutes
};

export type CalendarAttendee = {
  name?: string;
  email: string;
  status?: string; // ACCEPTED, DECLINED, TENTATIVE, NEEDS-ACTION
  role?: string; // REQ-PARTICIPANT, OPT-PARTICIPANT, CHAIR
  type?: string; // INDIVIDUAL, ROOM, etc.
};

export type CalendarOrganizer = {
  name?: string;
  email: string;
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
  status?: string; // CONFIRMED, TENTATIVE, CANCELLED
  url?: string;
  meetLink?: string;
  organizer?: CalendarOrganizer;
  attendees?: CalendarAttendee[];
};

export type CachedFeedData = {
  feedId: string;
  feedName: string;
  lastSyncedAt: string; // ISO 8601
  events: CalendarEvent[];
};
