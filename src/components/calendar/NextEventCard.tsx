import { format, formatDistanceToNow } from "date-fns";
import { Calendar, Clock, Info, MapPin, Users, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { collectMeetLinks } from "#/lib/calendar/meet-links";
import type { CalendarEvent } from "#/lib/calendar/types";
import { CalendarEventDialog } from "./CalendarEventDialog";

type Props = {
  events: CalendarEvent[];
};

export function NextEventCard({ events }: Props) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const upcomingEvents = events
    .filter((e) => new Date(e.end) > now && !e.allDay)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const nextEvent = upcomingEvents[0];

  if (!nextEvent) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="size-3.5" />
          <p className="text-xs">No upcoming events</p>
        </div>
      </div>
    );
  }

  const meetLinks = collectMeetLinks(nextEvent.meetLink, nextEvent.description);

  const startTime = new Date(nextEvent.start);
  const endTime = new Date(nextEvent.end);
  const isInProgress = startTime <= now;
  const isStartingSoon = !isInProgress && startTime.getTime() - now.getTime() < 5 * 60 * 1000;

  const statusLabel = isInProgress ? "In progress" : isStartingSoon ? "Starting soon" : "Next event";
  const statusDotClass = isInProgress
    ? "animate-pulse bg-[var(--coral)]"
    : isStartingSoon
      ? "animate-pulse bg-[var(--coral)]"
      : "bg-[var(--teal)]";

  const countdown = isInProgress
    ? `ends ${formatDistanceToNow(endTime, { addSuffix: true })}`
    : formatDistanceToNow(startTime, { addSuffix: true });

  const attendeeNames = nextEvent.attendees
    ?.filter((a) => a.email !== nextEvent.organizer?.email)
    .map((a) => a.name?.replace(/\\,/g, ",") || a.email.split("@")[0]);
  const attendeeCount = attendeeNames?.length || 0;

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`size-2 rounded-full ${statusDotClass}`} />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{statusLabel}</span>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{countdown}</span>
        </div>

        <h3 className="mb-1 text-base font-semibold leading-tight">{nextEvent.title}</h3>

        <div className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="size-3.5 shrink-0" />
          <span>
            {format(startTime, "h:mm a")} – {format(endTime, "h:mm a")}
          </span>
        </div>

        {nextEvent.location && (
          <div className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{nextEvent.location}</span>
          </div>
        )}

        {attendeeCount > 0 && (
          <div className="mb-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3.5 shrink-0" />
              <span>
                {attendeeCount} attendee{attendeeCount !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {attendeeNames?.slice(0, 5).map((name) => (
                <span key={name} className="inline-flex items-center gap-1 rounded-full bg-accent/60 px-2 py-0.5 text-xs">
                  {name}
                </span>
              ))}
              {attendeeCount > 5 && (
                <span className="inline-flex items-center rounded-full bg-accent/40 px-2 py-0.5 text-xs text-muted-foreground">
                  +{attendeeCount - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {meetLinks.map((link) => (
            <Button key={link.url} asChild size="sm" className="flex-1 gap-1.5">
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                <Video className="size-3.5" />
                {link.type === "teams" ? "Teams" : "Meet"}
              </a>
            </Button>
          ))}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSelectedEvent(nextEvent)}>
            <Info className="size-3" />
            Details
          </Button>
        </div>
      </div>

      <CalendarEventDialog event={selectedEvent} open={!!selectedEvent} onClose={() => setSelectedEvent(null)} />
    </>
  );
}
