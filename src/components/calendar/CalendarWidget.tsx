import {
	addDays,
	addMonths,
	addWeeks,
	eachDayOfInterval,
	endOfMonth,
	endOfWeek,
	format,
	isSameDay,
	isSameMonth,
	isToday,
	startOfMonth,
	startOfWeek,
	subDays,
	subMonths,
	subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useCallback, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "#/components/ui/tooltip";
import type { CalendarEvent } from "#/lib/calendar/types";
import { cn } from "#/lib/utils";
import { DayDetailPanel } from "./DayDetailPanel";

type Props = {
	events: CalendarEvent[];
	children?: ReactNode;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarWidget({ events, children }: Props) {
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const gridRef = useRef<HTMLDivElement>(null);

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

	const navigateToDate = useCallback(
		(date: Date) => {
			setSelectedDate(date);
			if (!isSameMonth(date, currentMonth)) {
				setCurrentMonth(startOfMonth(date));
			}
			// Focus the new day button after render
			requestAnimationFrame(() => {
				const btn = gridRef.current?.querySelector(
					`[data-date="${format(date, "yyyy-MM-dd")}"]`,
				) as HTMLButtonElement | null;
				btn?.focus();
			});
		},
		[currentMonth],
	);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			let next: Date | null = null;
			switch (e.key) {
				case "ArrowRight":
					next = addDays(selectedDate, 1);
					break;
				case "ArrowLeft":
					next = subDays(selectedDate, 1);
					break;
				case "ArrowDown":
					next = addWeeks(selectedDate, 1);
					break;
				case "ArrowUp":
					next = subWeeks(selectedDate, 1);
					break;
				case "Home":
					next = startOfWeek(selectedDate);
					break;
				case "End":
					next = endOfWeek(selectedDate);
					break;
				default:
					return;
			}
			e.preventDefault();
			navigateToDate(next);
		},
		[selectedDate, navigateToDate],
	);

	return (
		<div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
			{/* Left column: calendar grid + slotted content */}
			<div>
				<div className="rounded-xl border border-border bg-card p-4">
					{/* Month navigation */}
					<div className="mb-3 flex items-center justify-between">
						<Button
							variant="ghost"
							size="icon"
							className="size-8"
							onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
						>
							<ChevronLeft className="size-4" />
						</Button>
						<div className="flex items-center gap-2">
							<h3 className="text-base font-semibold">{format(currentMonth, "MMMM yyyy")}</h3>
							{!isSameMonth(currentMonth, new Date()) && (
								<Button
									variant="outline"
									size="sm"
									className="h-6 px-2 text-xs"
									onClick={() => {
										setCurrentMonth(new Date());
										setSelectedDate(new Date());
									}}
								>
									Today
								</Button>
							)}
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="size-8"
							onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
						>
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
					<TooltipProvider>
						<div ref={gridRef} className="grid grid-cols-7" role="grid" aria-label="Calendar" onKeyDown={handleKeyDown}>
							{days.map((day) => {
								const dayEvents = eventsForDay(day);
								const inMonth = isSameMonth(day, currentMonth);
								const today = isToday(day);
								const selected = isSameDay(day, selectedDate);
								const hasEvents = dayEvents.length > 0;

								const cell = (
									<button
										key={day.toISOString()}
										type="button"
										role="gridcell"
										data-date={format(day, "yyyy-MM-dd")}
										tabIndex={selected ? 0 : -1}
										aria-label={`${format(day, "EEEE, MMMM d")}${hasEvents ? `, ${dayEvents.length} event${dayEvents.length > 1 ? "s" : ""}` : ""}`}
										aria-selected={selected}
										onClick={() => setSelectedDate(day)}
										className={cn(
											"relative flex min-h-[2.5rem] flex-col items-center gap-0.5 rounded-md p-1 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)] focus-visible:ring-offset-1",
											!inMonth && "text-muted-foreground/40",
											today && "font-bold",
											selected && !today && "bg-accent ring-1 ring-[var(--teal)]",
											selected && today && "ring-1 ring-[var(--teal)] ring-offset-1 ring-offset-card",
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
										{hasEvents && (
											<div className="flex flex-wrap justify-center gap-0.5">
												{dayEvents.slice(0, 3).map((e) => (
													<span key={e.uid} className="size-1.5 rounded-full" style={{ backgroundColor: e.color }} />
												))}
												{dayEvents.length > 3 && (
													<span className="text-[10px] leading-none text-muted-foreground">+{dayEvents.length - 3}</span>
												)}
											</div>
										)}
									</button>
								);

								// Wrap days with events in a tooltip preview
								if (hasEvents) {
									return (
										<Tooltip key={day.toISOString()}>
											<TooltipTrigger asChild>{cell}</TooltipTrigger>
											<TooltipContent side="bottom" className="max-w-[220px] space-y-0.5 p-2">
												{dayEvents.slice(0, 5).map((e) => (
													<div key={e.uid} className="flex items-center gap-1.5 text-[11px]">
														<span
															className="size-1.5 shrink-0 rounded-full"
															style={{
																backgroundColor: e.color,
															}}
														/>
														<span className="truncate">
															{e.allDay ? e.title : `${format(new Date(e.start), "h:mm a")} ${e.title}`}
														</span>
													</div>
												))}
												{dayEvents.length > 5 && (
													<div className="text-[10px] text-muted-foreground/70">+{dayEvents.length - 5} more</div>
												)}
											</TooltipContent>
										</Tooltip>
									);
								}

								return cell;
							})}
						</div>
					</TooltipProvider>
				</div>

				{/* Slotted content (e.g. quick actions) fills space below the calendar */}
				{children}
			</div>

			{/* Day detail panel */}
			<DayDetailPanel date={selectedDate} events={selectedEvents} />
		</div>
	);
}
