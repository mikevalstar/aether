---
title: Calendar Integration
status: done
owner: self
last_updated: 2026-03-22
canonical_file: docs/requirements/calendar.md
---

# Calendar Integration

## Purpose

- Problem: No visibility into upcoming meetings or schedule from within Aether. The AI can't reference calendar data when summarizing your day or generating daily notes.
- Outcome: Users add iCal URLs in settings, Aether syncs them on a configurable schedule, a full interactive calendar lives on the dashboard, and the AI can query events by date range.
- Notes: Primary use case is AI-powered daily summaries — e.g., generating a meeting list into an Obsidian daily note.

## Current Reality

- Current behavior: Calendar integration is fully implemented. The dashboard includes a month calendar, day detail panel, and next-event card in a draggable grid layout.
- Constraints: Single-user app, so no shared calendar concerns. iCal is read-only (no event creation).
- Non-goals: Creating/editing calendar events, CalDAV write-back, calendar sharing, reminders/alerts for events.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| iCal URL management | done | Users can add/remove any number of iCal feed URLs in settings, each with a display name, color, and sync interval. |
| Periodic sync | done | A system task fetches each iCal feed on its configured interval and caches parsed events to disk. |
| Dashboard calendar widget | done | Full interactive month calendar with day selection, day detail panel, and next-event card on the dashboard grid. |
| AI tool | done | `calendar_events` tool lets the AI query events for a date range, including attendees, organizer, status, and meeting links. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Settings UI | done | Dedicated `/settings/calendar` page to manage iCal feed list with manual sync. | Inline |
| Preferences storage | done | Extend `UserPreferences` with `calendarFeeds` array. | Inline |
| iCal fetcher | done | Server-side fetch + parse of `.ics` feeds using `node-ical`, with CalendarBridge compatibility. | Inline |
| File cache | done | Parsed events cached as JSON files in `data/calendars/`, one per feed. | Inline |
| Sync scheduler | done | System task that runs sync per-feed based on each feed's configured interval. | Inline |
| Manual sync | done | "Sync now" button on settings page triggers immediate sync with per-feed result reporting. | Inline |
| Month calendar view | done | Month grid with left/right arrows, today button, keyboard navigation, and event dot tooltips. | Inline |
| Day detail panel | done | Selecting a day shows a list of timed events with clickable cards, plus all-day event chips at top. | Inline |
| Event detail dialog | done | Clicking an event card opens a dialog with full details: time, location, meeting links, organizer, attendees, description. | Inline |
| Next event card | done | Dashboard widget showing the next upcoming event with countdown, attendee list, and join-meeting buttons. | Inline |
| Meeting link extraction | done | Extracts Google Meet links from iCal data and Teams links from event descriptions. | Inline |
| Multi-calendar colors | done | Each feed gets a user-chosen color via native color picker; events render in that color on the calendar. | Inline |
| AI tool: `calendar_events` | done | Tool accepting start/end dates, returns event summaries with attendees, organizer, status, and meeting links. | Inline |
| Server functions | done | API layer to read cached calendar data for both the dashboard widget and AI tool. | Inline |

## Detail

### Settings: iCal feed management

- Dedicated settings page at `/settings/calendar`.
- Each feed entry has: display name, iCal URL, color (native color picker with preset defaults), sync interval (dropdown: 1m, 5m, 15m, 30m, 1h, 6h, 12h, 24h).
- Add/remove feeds dynamically. No hard limit on count.
- "Sync now" button triggers immediate sync of all feeds, displaying per-feed success/failure results with event counts.
- Stored in `UserPreferences.calendarFeeds` as an array:
  ```ts
  type CalendarFeed = {
    id: string;          // crypto.randomUUID (truncated)
    name: string;        // display name
    url: string;         // iCal URL
    color: string;       // hex color
    syncInterval: number; // minutes
  };
  ```
- Validates that each feed has a name and URL on save.

### Sync & caching

- Runs as a `calendar-sync` system task registered in `system-tasks.ts` with a `* * * * *` cron (every minute).
- On each tick, checks which feeds are due for sync based on their `syncInterval` and last sync time.
- Fetches the `.ics` URL, applies malformed timestamp fixes (for feeds that append timezone offsets incorrectly), then parses with `node-ical`.
- Splits raw ICS text into individual VEVENT blocks and parses each independently to handle calendar bridges (e.g., CalendarBridge) that pre-expand recurring events with duplicate UIDs.
- Write parsed events as JSON to `data/calendars/{feedId}.json`.
- Each cached file contains: feed ID, feed name, last synced timestamp, and an array of normalized events.
- Normalized event shape:
  ```ts
  type CalendarEvent = {
    uid: string;
    title: string;
    description?: string;
    location?: string;
    start: string;       // ISO 8601
    end: string;         // ISO 8601
    allDay: boolean;
    recurrenceId?: string;
    calendarFeedId: string;
    calendarName: string;
    color: string;
    status?: string;     // CONFIRMED, TENTATIVE, CANCELLED
    url?: string;
    meetLink?: string;   // Google Meet link
    organizer?: CalendarOrganizer;
    attendees?: CalendarAttendee[];
  };

  type CalendarOrganizer = {
    name?: string;
    email: string;
  };

  type CalendarAttendee = {
    name?: string;
    email: string;
    status?: string;  // ACCEPTED, DECLINED, TENTATIVE, NEEDS-ACTION
    role?: string;    // REQ-PARTICIPANT, OPT-PARTICIPANT, CHAIR
    type?: string;    // INDIVIDUAL, ROOM, etc.
  };
  ```
- Room resources (CUTYPE=ROOM) are filtered out of the attendee list.
- Handles recurring events by expanding occurrences within a window of 3 months past to 6 months future.
- Gracefully handles fetch failures (logs error, keeps stale cache, retries next interval). Skips events with invalid dates (logs warning).

### Dashboard calendar widget

- Calendar, day detail, and next event are separate widgets in a draggable `react-grid-layout` responsive grid on `/dashboard`.
- **Month view**: Grid of days for the current month. Left/right arrows to navigate months. "Today" button appears when viewing a non-current month. Today visually highlighted with a teal circle. Full keyboard navigation (arrow keys, Home/End).
- Days with events show colored dots (up to 3, then a "+N" count). Hovering a day with events shows a tooltip with up to 5 event previews.
- **Day detail panel**: Separate grid widget showing events for the selected date. All-day events displayed as compact chips at the top. Timed events shown as clickable cards with time, location, attendee count, and meet link icon. Past events are dimmed. Cancelled events are struck through.
- **Event detail dialog**: Clicking an event card opens a dialog showing full event information: date/time, location, meeting links (Google Meet and/or Teams), description, organizer, and attendee list with RSVP status indicators (teal=accepted, red=declined, gray=pending). Join meeting buttons at the bottom.
- **Next event card**: Shows the next upcoming timed event with live countdown ("in 2 hours", "ends in 30 minutes"), status indicator (in progress, starting soon, or next), attendee list, and quick join-meeting buttons. Updates every 30 seconds.
- **Meeting link extraction**: Google Meet links are extracted from the `X-GOOGLE-MEET` iCal property or from the event URL. Teams links are extracted from event descriptions via regex. Both are surfaced in event cards and the detail dialog (`src/lib/calendar/meet-links.ts`).
- Events colored per their calendar feed color.
- Multi-calendar events interleave correctly when overlapping.
- Data loaded via server function that reads all cached events at dashboard load time.

### AI tool: `calendar_events`

- Defined in `src/lib/tools/calendar-events.ts`, registered in `ai-tools.ts` via the `createAiTools()` pattern.
- Input schema: `{ startDate: string, endDate: string }` (ISO date strings).
- Returns: object with `timezone` (user's configured timezone) and `events` array sorted by start time, with title, start, end (formatted in user's local timezone), allDay, duration (minutes), location, calendar name, status, meetLink, organizer, and attendees.
- Event times are converted from UTC to the user's timezone (from preferences, falling back to `DEFAULT_TIMEZONE` env var, then system timezone) using `dayjs` with timezone plugin.
- Reads from the same file cache as the dashboard.
- Useful for prompts like "what's on my calendar today?" or "summarize my meetings this week".

## Resolved Questions

- Calendar widgets live alongside other dashboard widgets (usage stats, recent chats, activity, board column) in a draggable responsive grid layout.
- No dedicated `/calendar` route — dashboard-only is sufficient.
- No event filtering by calendar in the dashboard UI (all feeds shown together).
- AI tool uses date range only, no keyword search.

## Implementation

| Step | Status | Plan |
| --- | --- | --- |
| 1. Preferences type | done | Extend `UserPreferences` with `calendarFeeds` array, add types for `CalendarFeed`. |
| 2. Settings UI | done | Add calendar feeds management page at `/settings/calendar` with manual sync. |
| 3. iCal parser | done | Add `node-ical` library, create `src/lib/calendar/ical-parser.ts` with CalendarBridge compatibility. |
| 4. Sync system task | done | Register `calendar-sync` in `system-tasks.ts`, implement per-feed interval logic. |
| 5. File cache layer | done | `src/lib/calendar/cache.ts` — read/write cached events, query by date range. |
| 6. Server functions | done | `src/lib/calendar/calendar.functions.ts` — API for dashboard + AI tool, including manual sync. |
| 7. Calendar widget | done | `src/components/calendar/` — month grid, day detail panel, event dialog, next event card. |
| 8. Meeting links | done | `src/lib/calendar/meet-links.ts` — extract Google Meet and Teams links from events. |
| 9. Dashboard integration | done | Add calendar, day-detail, and next-event widgets to dashboard grid. |
| 10. AI tool | done | Add `calendar_events` tool in `src/lib/tools/calendar-events.ts`. |

## Change Log

- 2026-03-22: Updated requirements to reflect actual implementation: settings page at `/settings/calendar`, extended event model with attendees/organizer/status/meeting links, event detail dialog, next event card, meeting link extraction, keyboard navigation, CalendarBridge compatibility.
- 2026-03-17: Implemented all calendar integration features: preferences UI, iCal sync, file cache, dashboard widget, and AI tool.
- 2026-03-17: Initial requirements for calendar integration feature.
