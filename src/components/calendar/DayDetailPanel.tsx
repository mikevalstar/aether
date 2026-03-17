import { format, isToday } from "date-fns";
import { Clock, MapPin } from "lucide-react";
import type { CalendarEvent } from "#/lib/calendar/types";
import { cn } from "#/lib/utils";

type Props = {
	date: Date;
	events: CalendarEvent[];
};

export function DayDetailPanel({ date, events }: Props) {
	const allDayEvents = events.filter((e) => e.allDay);
	const timedEvents = events.filter((e) => !e.allDay);

	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<h3 className="mb-3 text-sm font-semibold">
				{format(date, "EEEE, MMM d")}
				{isToday(date) && (
					<span className="ml-2 rounded-full bg-[var(--teal)] px-2 py-0.5 text-[10px] font-medium text-white">Today</span>
				)}
			</h3>

			{events.length === 0 ? (
				<p className="text-xs text-muted-foreground">No events</p>
			) : (
				<div className="grid gap-2">
					{/* All-day events */}
					{allDayEvents.map((event) => (
						<EventCard key={event.uid} event={event} />
					))}

					{/* Timed events */}
					{timedEvents.map((event) => (
						<EventCard key={event.uid} event={event} />
					))}
				</div>
			)}
		</div>
	);
}

function EventCard({ event }: { event: CalendarEvent }) {
	const startTime = event.allDay ? null : format(new Date(event.start), "h:mm a");
	const endTime = event.allDay ? null : format(new Date(event.end), "h:mm a");

	return (
		<div className={cn("rounded-md border-l-2 p-2.5 text-xs", "bg-accent/50")} style={{ borderLeftColor: event.color }}>
			<p className="font-medium leading-tight">{event.title}</p>

			{startTime && (
				<p className="mt-1 flex items-center gap-1 text-muted-foreground">
					<Clock className="size-3" />
					{startTime} – {endTime}
				</p>
			)}

			{event.allDay && <p className="mt-1 text-muted-foreground">All day</p>}

			{event.location && (
				<p className="mt-0.5 flex items-center gap-1 text-muted-foreground">
					<MapPin className="size-3" />
					{event.location}
				</p>
			)}

			<p className="mt-1 text-muted-foreground/70">{event.calendarName}</p>
		</div>
	);
}
