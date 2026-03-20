import { addMonths, subMonths } from "date-fns";
import ical, { type ParameterValue } from "node-ical";
import { logger } from "#/lib/logger";
import type { CalendarAttendee, CalendarEvent, CalendarFeed, CalendarOrganizer } from "./types";

/** Extract the string value from a ParameterValue (which can be string or {val, params}). */
function paramStr(val: ParameterValue | undefined): string | undefined {
  if (val == null) return undefined;
  if (typeof val === "string") return val;
  return val.val;
}

function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

function normalizeEvent(vevent: ical.VEvent, feed: CalendarFeed, start: Date, end: Date): CalendarEvent | null {
  if (!isValidDate(start) || !isValidDate(end)) {
    console.warn(`[ical-parser] Skipping event with invalid date: ${vevent.uid}`, {
      start: String(start),
      end: String(end),
    });
    return null;
  }

  const isAllDay =
    vevent.datetype === "date" ||
    (start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 0 && end.getMinutes() === 0);

  // Extract organizer
  let organizer: CalendarOrganizer | undefined;
  if (vevent.organizer) {
    const orgVal = typeof vevent.organizer === "string" ? vevent.organizer : vevent.organizer.val;
    const orgParams = typeof vevent.organizer === "string" ? undefined : vevent.organizer.params;
    organizer = {
      email: orgVal?.replace(/^mailto:/i, "") || "",
      name: orgParams?.CN || undefined,
    };
  }

  // Extract attendees
  let attendees: CalendarAttendee[] | undefined;
  const rawAttendees = vevent.attendee;
  if (rawAttendees) {
    const attendeeList = Array.isArray(rawAttendees) ? rawAttendees : [rawAttendees];
    attendees = attendeeList.map((a) => {
      const val = typeof a === "string" ? a : a.val;
      const params = typeof a === "string" ? undefined : a.params;
      return {
        email: val?.replace(/^mailto:/i, "") || "",
        name: params?.CN || undefined,
        status: params?.PARTSTAT || undefined,
        role: params?.ROLE || undefined,
        type: params?.CUTYPE || undefined,
      };
    });
    // Filter out room resources for cleaner data
    attendees = attendees.filter((a) => a.type !== "ROOM");
  }

  // Extract URL / meet link
  const url = paramStr(vevent.url) || undefined;
  const meetLink =
    (vevent as Record<string, unknown>)["X-GOOGLE-MEET"] as string | undefined;

  // Extract status
  const status = paramStr(vevent.status) || undefined;

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
    status,
    url,
    meetLink: meetLink || (url?.includes("meet.google.com") ? url : undefined),
    organizer,
    attendees: attendees?.length ? attendees : undefined,
  };
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
function fixMalformedIcsTimestamps(icsText: string): string {
  return icsText.replace(
    /(DT(?:START|END);(?:TZID=[^:]+|VALUE=DATE(?:TIME)?)):(\d{8}T\d{6})(\d{4,5})(Z?)/g,
    (_, prefix, dateTime, _tzOffset, z) => {
      if (z) return `${prefix}:${dateTime}${z}`;
      return `${prefix}:${dateTime}`;
    },
  );
}

export async function fetchAndParseIcal(feed: CalendarFeed): Promise<CalendarEvent[]> {
  logger.debug({ feedId: feed.id, url: feed.url }, "Fetching iCal feed");
  const response = await fetch(feed.url);
  if (!response.ok) {
    throw new Error(`Failed to fetch iCal feed: ${response.status} ${response.statusText}`);
  }
  const rawIcsText = await response.text();
  logger.debug({ feedId: feed.id, rawBytes: rawIcsText.length }, "Received iCal data");
  const icsText = fixMalformedIcsTimestamps(rawIcsText);

  const now = new Date();
  const windowStart = subMonths(now, 3);
  const windowEnd = addMonths(now, 6);

  const events: CalendarEvent[] = [];

  // Extract the VCALENDAR preamble (everything before the first VEVENT)
  const preambleMatch = icsText.match(/^([\s\S]*?)(?=BEGIN:VEVENT)/);
  const preamble = preambleMatch ? preambleMatch[1].trim() : "BEGIN:VCALENDAR\nVERSION:2.0";

  // Split into individual VEVENT blocks and parse each independently
  const veventBlocks = icsText.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
  let skippedInvalid = 0;

  if (veventBlocks.length === 0) {
    logger.warn({ feedId: feed.id }, "No VEVENT blocks found in iCal feed");
  }

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
          if (!instance.start || !instance.end) continue;
          const normalized = normalizeEvent(vevent, feed, new Date(instance.start), new Date(instance.end));
          if (normalized) events.push(normalized);
        }
      } else {
        const start = new Date(vevent.start);
        const end = vevent.end ? new Date(vevent.end) : start;

        if (end < windowStart || start > windowEnd) continue;

        const normalized = normalizeEvent(vevent, feed, start, end);
        if (normalized) {
          events.push(normalized);
        } else {
          skippedInvalid++;
        }
      }
    }
  }

  if (skippedInvalid > 0) {
    logger.warn({ feedId: feed.id, skippedInvalid }, "Skipped events with invalid dates");
  }
  logger.debug({ feedId: feed.id, veventBlocks: veventBlocks.length, parsedEvents: events.length }, "iCal feed parsed");

  return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}
