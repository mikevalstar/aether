import { format, isToday } from "date-fns";
import { Clock, MapPin, Users, Video } from "lucide-react";
import { useEffect, useState } from "react";
import type { CalendarEvent } from "#/lib/calendar/types";
import { cn } from "#/lib/utils";

type Props = {
  date: Date;
  events: CalendarEvent[];
};

export function DayDetailPanel({ date, events }: Props) {
  const allDayEvents = events.filter((e) => e.allDay);
  const timedEvents = events.filter((e) => !e.allDay);
  const uniqueCalendars = new Set(events.map((e) => e.calendarName));
  const showCalendarName = uniqueCalendars.size > 1;

  // Deduplicate all-day events by title (same event from multi-day span or multiple feeds)
  const uniqueAllDay = allDayEvents.filter((event, i, arr) => arr.findIndex((e) => e.title === event.title) === i);

  return (
    <div className="flex max-h-[calc(100vh-16rem)] min-h-0 flex-col rounded-xl border border-border bg-card">
      <div className="shrink-0 px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold">
          {format(date, "EEEE, MMM d")}
          {isToday(date) && (
            <span className="ml-2 rounded-full bg-[var(--teal)] px-2 py-0.5 text-[10px] font-medium text-white">Today</span>
          )}
        </h3>

        {/* All-day events as compact chips */}
        {uniqueAllDay.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {uniqueAllDay.map((event) => (
              <span
                key={event.uid}
                className="inline-flex items-center gap-1 rounded-full bg-accent/60 px-2 py-0.5 text-[11px] font-medium"
              >
                <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: event.color }} />
                <span className="max-w-[140px] truncate">{event.title}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {timedEvents.length === 0 && allDayEvents.length === 0 ? (
        <p className="px-4 pb-4 text-xs text-muted-foreground">No events</p>
      ) : timedEvents.length === 0 ? null : (
        <div className="min-h-0 overflow-y-auto px-4 pb-4">
          <div className="grid gap-1.5">
            {timedEvents.map((event) => (
              <EventCard key={event.uid} event={event} showCalendarName={showCalendarName} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({ event, showCalendarName }: { event: CalendarEvent; showCalendarName: boolean }) {
  const startTime = format(new Date(event.start), "h:mm a");
  const endTime = format(new Date(event.end), "h:mm a");
  const isCancelled = event.status === "CANCELLED";
  // Defer isPast to client to avoid hydration mismatch (server vs client clock)
  const [eventPast, setEventPast] = useState(false);
  useEffect(() => {
    setEventPast(new Date(event.end) < new Date());
  }, [event.end]);

  // Attendee summary: filter out the organizer, show up to 3 names
  const attendeeNames = event.attendees
    ?.filter((a) => a.email !== event.organizer?.email)
    .map((a) => a.name || a.email.split("@")[0]);
  const attendeeCount = attendeeNames?.length || 0;

  return (
    <div
      className={cn(
        "min-w-0 rounded-md border-l-2 bg-accent/50 p-2 text-xs transition-opacity",
        eventPast && "opacity-45",
        isCancelled && "opacity-40 line-through decoration-muted-foreground/50",
      )}
      style={{ borderLeftColor: event.color }}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="truncate font-medium leading-tight" title={event.title}>
          {isCancelled && <span className="mr-1 text-destructive no-underline">[Cancelled]</span>}
          {event.title}
        </p>
        {event.meetLink && (
          <a
            href={event.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded p-0.5 text-[var(--teal)] hover:bg-[var(--teal-subtle)] transition-colors"
            title="Join meeting"
            onClick={(e) => e.stopPropagation()}
          >
            <Video className="size-3.5" />
          </a>
        )}
      </div>

      <p className="mt-1 flex items-center gap-1 text-muted-foreground">
        <Clock className="size-3 shrink-0" />
        {startTime} – {endTime}
      </p>

      {event.location && (
        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-muted-foreground">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate" title={event.location}>
            {event.location}
          </span>
        </p>
      )}

      {attendeeCount > 0 && attendeeNames && (
        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-muted-foreground">
          <Users className="size-3 shrink-0" />
          <span className="truncate" title={attendeeNames.join(", ")}>
            {attendeeCount <= 3 ? attendeeNames.join(", ") : `${attendeeNames.slice(0, 2).join(", ")} +${attendeeCount - 2}`}
          </span>
        </p>
      )}

      {showCalendarName && <p className="mt-1 text-muted-foreground/70">{event.calendarName}</p>}
    </div>
  );
}
