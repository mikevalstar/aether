import { format } from "date-fns";
import { Calendar, Clock, ExternalLink, Globe, Link2, MapPin, Users, Video } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { collectMeetLinks } from "#/lib/calendar/meet-links";
import type { CalendarEvent } from "#/lib/calendar/types";

type Props = {
  event: CalendarEvent | null;
  open: boolean;
  onClose: () => void;
};

export function CalendarEventDialog({ event, open, onClose }: Props) {
  const isCancelled = event?.status === "CANCELLED";
  const meetLinks = collectMeetLinks(event?.meetLink, event?.description);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <div className="flex items-start justify-between gap-4 pr-4">
            <DialogTitle className={isCancelled ? "text-destructive line-through" : ""}>{event?.title}</DialogTitle>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {event?.calendarName && (
              <Badge
                variant="outline"
                className="gap-1 px-2 py-1 text-xs"
                style={{ borderColor: event.color, color: event.color }}
              >
                <Calendar className="size-3" />
                {event.calendarName}
              </Badge>
            )}
            {isCancelled && (
              <Badge variant="destructive" className="gap-1 px-2 py-1 text-xs">
                Cancelled
              </Badge>
            )}
            {event?.allDay && (
              <Badge variant="outline" className="gap-1 px-2 py-1 text-xs">
                All day
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm">{event && format(new Date(event.start), "EEEE, MMMM d, yyyy")}</p>
              <p className="text-sm text-muted-foreground">
                {event?.allDay
                  ? "All day"
                  : event && `${format(new Date(event.start), "h:mm a")} – ${format(new Date(event.end), "h:mm a")}`}
              </p>
            </div>
          </div>

          {event?.location && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="text-sm">{event.location}</p>
            </div>
          )}

          {meetLinks.length > 0 && (
            <div className="flex items-start gap-3">
              <Video className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="flex flex-col gap-1">
                {meetLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-[var(--teal)] hover:underline"
                  >
                    Join {link.type === "teams" ? "Teams" : "Google Meet"} meeting
                    <ExternalLink className="size-3" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {event?.url && (
            <div className="flex items-start gap-3">
              <Link2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-[var(--teal)] hover:underline"
              >
                View in calendar
                <ExternalLink className="size-3" />
              </a>
            </div>
          )}

          {event?.description && (
            <div className="max-h-96 overflow-y-auto rounded-md border bg-muted/30 p-3">
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{event.description}</p>
            </div>
          )}

          {event?.organizer && (
            <div className="flex items-start gap-3">
              <Globe className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Organizer</p>
                <p className="text-sm">{event.organizer.name || event.organizer.email}</p>
              </div>
            </div>
          )}

          {event?.attendees && event.attendees.length > 0 && (
            <div className="flex items-start gap-3">
              <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  {event.attendees.length} attendee{event.attendees.length !== 1 ? "s" : ""}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {event.attendees.slice(0, 8).map((attendee) => (
                    <span
                      key={attendee.email}
                      className="inline-flex items-center gap-1 rounded-full bg-accent/60 px-2 py-0.5 text-xs"
                      title={attendee.email}
                    >
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            attendee.status === "ACCEPTED"
                              ? "var(--teal)"
                              : attendee.status === "DECLINED"
                                ? "var(--destructive)"
                                : "var(--muted-foreground)",
                        }}
                      />
                      <span className="max-w-[120px] truncate">
                        {attendee.name?.replace(/\\,/g, ",") || attendee.email.split("@")[0]}
                      </span>
                    </span>
                  ))}
                  {event.attendees.length > 8 && (
                    <span className="inline-flex items-center rounded-full bg-accent/40 px-2 py-0.5 text-xs text-muted-foreground">
                      +{event.attendees.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {meetLinks.length === 1 && (
            <div className="pt-2">
              <Button asChild className="w-full gap-2">
                <a href={meetLinks[0].url} target="_blank" rel="noopener noreferrer">
                  <Video className="size-4" />
                  Join Meeting
                </a>
              </Button>
            </div>
          )}
          {meetLinks.length === 2 && (
            <div className="flex gap-2 pt-2">
              <Button asChild className="flex-1 gap-2">
                <a href={meetLinks[0].url} target="_blank" rel="noopener noreferrer">
                  <Video className="size-4" />
                  Join Google
                </a>
              </Button>
              <Button asChild className="flex-1 gap-2">
                <a href={meetLinks[1].url} target="_blank" rel="noopener noreferrer">
                  <Video className="size-4" />
                  Join Teams
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
