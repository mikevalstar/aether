import { addMonths, subMonths } from "date-fns";
import ical, { type ParameterValue } from "node-ical";
import type { CalendarEvent, CalendarFeed } from "./types";

/** Extract the string value from a ParameterValue (which can be string or {val, params}). */
function paramStr(val: ParameterValue | undefined): string | undefined {
  if (val == null) return undefined;
  if (typeof val === "string") return val;
  return val.val;
}

/**
 * Fetch and parse an iCal feed URL, returning normalized CalendarEvent[].
 * Recurring events are expanded within a window of 3 months past to 6 months future.
 *
 * Note: Some calendar bridges (e.g. CalendarBridge) pre-expand recurring events
 * into individual VEVENTs that share the same UID. node-ical uses UID as a dict
 * key, so duplicate UIDs get overwritten. To handle this, we split the raw ICS
 * text into individual VEVENT blocks and parse each one separately.
 */
export async function fetchAndParseIcal(feed: CalendarFeed): Promise<CalendarEvent[]> {
  const response = await fetch(feed.url);
  if (!response.ok) {
    throw new Error(`Failed to fetch iCal feed: ${response.status} ${response.statusText}`);
  }
  const icsText = await response.text();

  const now = new Date();
  const windowStart = subMonths(now, 3);
  const windowEnd = addMonths(now, 6);

  const events: CalendarEvent[] = [];

  // Extract the VCALENDAR preamble (everything before the first VEVENT)
  const preambleMatch = icsText.match(/^([\s\S]*?)(?=BEGIN:VEVENT)/);
  const preamble = preambleMatch ? preambleMatch[1].trim() : "BEGIN:VCALENDAR\nVERSION:2.0";

  // Split into individual VEVENT blocks and parse each independently
  const veventBlocks = icsText.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];

  for (const block of veventBlocks) {
    // Wrap each VEVENT in a minimal VCALENDAR so node-ical can parse it
    const miniIcs = `${preamble}\n${block}\nEND:VCALENDAR`;
    const parsed = ical.sync.parseICS(miniIcs);

    for (const component of Object.values(parsed)) {
      if (!component || component.type !== "VEVENT") continue;

      const vevent = component as ical.VEvent;

      if (vevent.rrule) {
        const instances = ical.expandRecurringEvent(vevent, {
          from: windowStart,
          to: windowEnd,
        });
        for (const instance of instances) {
          events.push(normalizeEvent(vevent, feed, new Date(instance.start), new Date(instance.end)));
        }
      } else {
        const start = new Date(vevent.start);
        const end = vevent.end ? new Date(vevent.end) : start;

        // Skip events outside the window
        if (end < windowStart || start > windowEnd) continue;

        events.push(normalizeEvent(vevent, feed, start, end));
      }
    }
  }

  return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

function normalizeEvent(vevent: ical.VEvent, feed: CalendarFeed, start: Date, end: Date): CalendarEvent {
  const isAllDay =
    vevent.datetype === "date" ||
    (start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 0 && end.getMinutes() === 0);

  return {
    uid: `${vevent.uid || feed.id}-${start.toISOString()}`,
    title: paramStr(vevent.summary) || "Untitled Event",
    description: paramStr(vevent.description) || undefined,
    location: paramStr(vevent.location) || undefined,
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: isAllDay,
    recurrenceId: vevent.recurrenceid ? String(vevent.recurrenceid) : undefined,
    calendarFeedId: feed.id,
    calendarName: feed.name,
    color: feed.color,
  };
}
