import {
	addMonths,
	eachDayOfInterval,
	endOfMonth,
	endOfWeek,
	format,
	isSameDay,
	isSameMonth,
	isToday,
	startOfMonth,
	startOfWeek,
	subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import type { CalendarEvent } from "#/lib/calendar/types";
import { cn } from "#/lib/utils";
import { DayDetailPanel } from "./DayDetailPanel";

type Props = {
	events: CalendarEvent[];
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarWidget({ events }: Props) {
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());

	const monthStart = startOfMonth(currentMonth);
	const monthEnd = endOfMonth(currentMonth);
	const calendarStart = startOfWeek(monthStart);
	const calendarEnd = endOfWeek(monthEnd);

	const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

	const eventsForDay = (date: Date) =>
		events.filter((e) => {
			const eventStart = new Date(e.start);
			const eventEnd = new Date(e.end);
			// For all-day events spanning multiple days, check overlap
			if (e.allDay) {
				const dayStart = new Date(date);
				dayStart.setHours(0, 0, 0, 0);
				const dayEnd = new Date(date);
				dayEnd.setHours(23, 59, 59, 999);
				return eventStart <= dayEnd && eventEnd >= dayStart;
			}
			return isSameDay(eventStart, date);
		});

	const selectedEvents = eventsForDay(selectedDate);

	return (
		<div className="grid gap-4 lg:grid-cols-[1fr_320px]">
			{/* Month grid */}
			<div className="rounded-xl border border-border bg-card p-4">
				{/* Month navigation */}
				<div className="mb-4 flex items-center justify-between">
					<Button variant="ghost" size="icon" className="size-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
						<ChevronLeft className="size-4" />
					</Button>
					<h3 className="text-sm font-semibold">{format(currentMonth, "MMMM yyyy")}</h3>
					<Button variant="ghost" size="icon" className="size-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
						<ChevronRight className="size-4" />
					</Button>
				</div>

				{/* Weekday headers */}
				<div className="mb-1 grid grid-cols-7">
					{WEEKDAYS.map((day) => (
						<div key={day} className="py-1 text-center text-xs font-medium text-muted-foreground">
							{day}
						</div>
					))}
				</div>

				{/* Day cells */}
				<div className="grid grid-cols-7">
					{days.map((day) => {
						const dayEvents = eventsForDay(day);
						const inMonth = isSameMonth(day, currentMonth);
						const today = isToday(day);
						const selected = isSameDay(day, selectedDate);

						return (
							<button
								key={day.toISOString()}
								type="button"
								onClick={() => setSelectedDate(day)}
								className={cn(
									"relative flex min-h-[3.5rem] flex-col items-center gap-0.5 rounded-md p-1 text-sm transition-colors hover:bg-accent",
									!inMonth && "text-muted-foreground/40",
									today && "font-bold",
									selected && "bg-accent ring-1 ring-[var(--teal)]",
								)}
							>
								<span
									className={cn(
										"flex size-6 items-center justify-center rounded-full text-xs",
										today && "bg-[var(--teal)] text-white",
									)}
								>
									{format(day, "d")}
								</span>
								{/* Event dots */}
								{dayEvents.length > 0 && (
									<div className="flex flex-wrap justify-center gap-0.5">
										{dayEvents.slice(0, 3).map((e) => (
											<span key={e.uid} className="size-1.5 rounded-full" style={{ backgroundColor: e.color }} />
										))}
										{dayEvents.length > 3 && (
											<span className="text-[9px] leading-none text-muted-foreground">+{dayEvents.length - 3}</span>
										)}
									</div>
								)}
							</button>
						);
					})}
				</div>
			</div>

			{/* Day detail panel */}
			<DayDetailPanel date={selectedDate} events={selectedEvents} />
		</div>
	);
}
