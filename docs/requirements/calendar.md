---
title: Calendar Integration
status: todo
owner: self
last_updated: 2026-03-17
canonical_file: docs/requirements/calendar.md
---

# Calendar Integration

## Purpose

- Problem: No visibility into upcoming meetings or schedule from within Aether. The AI can't reference calendar data when summarizing your day or generating daily notes.
- Outcome: Users add iCal URLs in preferences, Aether syncs them on a configurable schedule, a full interactive calendar lives on the dashboard, and the AI can query events by date range.
- Notes: Primary use case is AI-powered daily summaries — e.g., generating a meeting list into an Obsidian daily note.

## Current Reality

- Current behavior: No calendar support exists. The dashboard is a grid of quick-action cards with no schedule visibility.
- Constraints: Single-user app, so no shared calendar concerns. iCal is read-only (no event creation).
- Non-goals: Creating/editing calendar events, CalDAV write-back, calendar sharing, reminders/alerts for events.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| iCal URL management | todo | Users can add/remove any number of iCal feed URLs in preferences, each with a display name, color, and sync interval. |
| Periodic sync | todo | A system task fetches each iCal feed on its configured interval and caches parsed events to disk. |
| Dashboard calendar widget | todo | Full interactive month calendar with day selection and hourly event layout for the selected day. |
| AI tool | todo | `calendar_events` tool lets the AI query events for a date range. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Preferences UI | todo | Section on `/settings/preferences` to manage iCal feed list. | Inline |
| Preferences storage | todo | Extend `UserPreferences` with `calendarFeeds` array. | Inline |
| iCal fetcher | todo | Server-side fetch + parse of `.ics` feeds using an iCal library. | Inline |
| File cache | todo | Parsed events cached as JSON files in a data folder, one per feed. | Inline |
| Sync scheduler | todo | System task that runs sync per-feed based on each feed's configured interval. | Inline |
| Month calendar view | todo | Full-width month grid with left/right arrows to navigate months. Today highlighted. | Inline |
| Day detail panel | todo | Selecting a day shows events laid out across hours, similar to Google Calendar day view. | Inline |
| Multi-calendar colors | todo | Each feed gets a user-chosen color; events render in that color on the calendar. | Inline |
| AI tool: `calendar_events` | todo | Tool accepting start/end dates, returns event summaries (title, time, duration, calendar name). | Inline |
| Server functions | todo | API layer to read cached calendar data for both the dashboard widget and AI tool. | Inline |

## Detail

### Preferences: iCal feed management

- New section on `/settings/preferences` below existing sections.
- Each feed entry has: display name, iCal URL, color (from a preset palette or picker), sync interval (dropdown: 5m, 15m, 30m, 1h, 6h, 12h, 24h).
- Add/remove feeds dynamically. No hard limit on count.
- Stored in `UserPreferences.calendarFeeds` as an array:
  ```ts
  type CalendarFeed = {
    id: string;          // nanoid
    name: string;        // display name
    url: string;         // iCal URL
    color: string;       // hex or tailwind color token
    syncInterval: number; // minutes
  };
  ```
- Validate URL format on save. Don't test-fetch on save (feeds may be slow).

### Sync & caching

- Runs as a system task registered in `system-tasks.ts`.
- On each tick (e.g., every minute), check which feeds are due for sync based on their `syncInterval` and last sync time.
- Fetch the `.ics` URL, parse with an iCal parsing library (e.g., `ical.js`, `node-ical`, or `tsdav`).
- Write parsed events as JSON to a cache directory (e.g., `data/calendars/{feedId}.json`).
- Each cached file contains: feed metadata, last synced timestamp, and an array of normalized events.
- Normalized event shape:
  ```ts
  type CalendarEvent = {
    uid: string;
    title: string;
    description?: string;
    location?: string;
    start: string;  // ISO 8601
    end: string;    // ISO 8601
    allDay: boolean;
    recurrenceId?: string;
    calendarFeedId: string;
    calendarName: string;
    color: string;
  };
  ```
- Handle recurring events by expanding occurrences within a reasonable window (e.g., 3 months past + 6 months future).
- Gracefully handle fetch failures (log warning, keep stale cache, retry next interval).

### Dashboard calendar widget

- Replaces or augments the current dashboard card grid — the calendar should be a prominent, full-width component.
- **Month view**: Grid of days for the current month. Left/right arrows to navigate months. Today visually highlighted.
- Days with events show colored dots or compact event previews.
- **Day detail**: Clicking a day opens an hourly timeline panel (similar to Google Calendar's day view). Events span their time slots visually. All-day events shown in a banner row at the top.
- Events colored per their calendar feed color.
- Multi-calendar events interleave correctly when overlapping.
- Data loaded via server function that reads from the file cache.

### AI tool: `calendar_events`

- Registered in `ai-tools.ts` via the existing `createAiTools()` pattern.
- Input schema: `{ startDate: string, endDate: string }` (ISO date strings).
- Returns: array of events in the range, sorted by start time, with title, start, end, duration, location, calendar name.
- Reads from the same file cache as the dashboard.
- Useful for prompts like "what's on my calendar today?" or "summarize my meetings this week".

## Open Questions

- Should the calendar widget replace the current dashboard cards or live alongside them (e.g., cards on top, calendar below)?
- Should there be a dedicated `/calendar` route, or is dashboard-only sufficient?
- Any need for event filtering by calendar in the dashboard UI?
- Should the AI tool also support searching events by title/keyword, or is date range enough?

## Implementation

| Step | Status | Plan |
| --- | --- | --- |
| 1. Preferences type | todo | Extend `UserPreferences` with `calendarFeeds` array, add types for `CalendarFeed`. |
| 2. Preferences UI | todo | Add calendar feeds management section to `/settings/preferences`. |
| 3. iCal parser | todo | Add iCal parsing library, create `src/lib/calendar/ical-parser.ts`. |
| 4. Sync system task | todo | Register calendar sync in `system-tasks.ts`, implement per-feed interval logic. |
| 5. File cache layer | todo | `src/lib/calendar/cache.ts` — read/write cached events, query by date range. |
| 6. Server functions | todo | `src/lib/calendar/calendar.functions.ts` — API for dashboard + AI tool. |
| 7. Calendar widget | todo | `src/components/calendar/` — month grid, day detail panel, event rendering. |
| 8. Dashboard integration | todo | Add calendar widget to `/dashboard`. |
| 9. AI tool | todo | Add `calendar_events` tool to `ai-tools.ts`. |

## Change Log

- 2026-03-17: Initial requirements for calendar integration feature.
