import { tool } from "ai";
import dayjs from "dayjs";
import { z } from "zod";
import { queryEvents } from "#/lib/calendar/cache";

export const calendarEvents = tool({
  description:
    "Query the user's calendar events for a date range. Use this when the user asks about their schedule, upcoming meetings, or what's on their calendar. Returns events sorted by start time with title, time, duration, location, and calendar name.",
  inputSchema: z.object({
    startDate: z.string().describe("Start date in ISO 8601 format (e.g. 2026-03-17T00:00:00.000Z)"),
    endDate: z.string().describe("End date in ISO 8601 format (e.g. 2026-03-18T00:00:00.000Z)"),
  }),
  execute: async ({ startDate, endDate }) => {
    const start = dayjs(startDate).startOf("day");
    const end = dayjs(endDate).endOf("day");

    if (!start.isValid() || !end.isValid()) {
      return { error: "Invalid date format. Please provide recognizable date strings." };
    }

    const events = queryEvents(start.toISOString(), end.toISOString());

    return events.map((e) => ({
      title: e.title,
      start: e.start,
      end: e.end,
      allDay: e.allDay,
      duration: Math.round((new Date(e.end).getTime() - new Date(e.start).getTime()) / (1000 * 60)),
      location: e.location || null,
      calendar: e.calendarName,
    }));
  },
});
