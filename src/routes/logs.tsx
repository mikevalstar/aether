import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import dayjs from "dayjs";
import { CalendarDays, Check, Copy, Pause, Play, Search, TerminalSquare, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { PageHeader } from "#/components/PageHeader";
import { PaginationControls } from "#/components/PaginationControls";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Input } from "#/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import { getSession } from "#/lib/auth.functions";
import { formatDate } from "#/lib/date";
import { getLogViewerData, type LogLevel, type LogViewerResult } from "#/lib/log-viewer.functions";

const logsSearchSchema = z.object({
  day: z.string().optional(),
  query: z.string().optional(),
  level: z.string().optional(),
  hour: z.coerce.number().int().min(0).max(23).optional(),
  page: z.coerce.number().optional(),
});

const LEVEL_OPTIONS: Array<{ value: "all" | LogLevel; label: string }> = [
  { value: "all", label: "All levels" },
  { value: "trace", label: "Trace" },
  { value: "debug", label: "Debug" },
  { value: "info", label: "Info" },
  { value: "warn", label: "Warn" },
  { value: "error", label: "Error" },
  { value: "fatal", label: "Fatal" },
];

export const Route = createFileRoute("/logs")({
  validateSearch: logsSearchSchema,
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    return await getLogViewerData({ data: deps });
  },
  component: LogsPage,
});

const POLL_INTERVAL_MS = 5000;

function LogsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const router = useRouter();
  const data = Route.useLoaderData() as LogViewerResult;
  const search = Route.useSearch() as z.infer<typeof logsSearchSchema>;
  const activeDay = search.day ?? data.selectedDay;
  const activeLevel = data.filters.level;
  const activeHour = data.filters.hour;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [queryInput, setQueryInput] = useState(data.filters.query);
  const [autoPoll, setAutoPoll] = useState(true);
  const [pollCycle, setPollCycle] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const seenIdsRef = useRef<Set<string> | null>(null);
  const isFirstLoadRef = useRef(true);

  // Track which entry IDs are new since the previous render so we can highlight them.
  const freshIds = useMemo(() => {
    const currentIds = new Set(data.entries.map((entry) => entry.id));
    const previous = seenIdsRef.current;
    const fresh = new Set<string>();
    if (previous && !isFirstLoadRef.current) {
      for (const id of currentIds) {
        if (!previous.has(id)) fresh.add(id);
      }
    }
    seenIdsRef.current = currentIds;
    isFirstLoadRef.current = false;
    return fresh;
  }, [data.entries]);

  useEffect(() => {
    if (!autoPoll) return;
    const id = setInterval(() => {
      void router.invalidate();
      setPollCycle((c) => c + 1);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [autoPoll, router]);
  const availableDaySet = new Set(data.availableDays);
  const selectedDate = activeDay ? dayjs(activeDay).toDate() : undefined;

  useEffect(() => {
    setQueryInput(data.filters.query);
  }, [data.filters.query]);

  function updateSearch(next: { day?: string; query?: string; level?: string; hour?: number | null; page?: number }) {
    const nextHour = next.hour === undefined ? activeHour : next.hour;
    void navigate({
      search: {
        day: next.day,
        query: next.query?.trim() ? next.query.trim() : undefined,
        level: next.level && next.level !== "all" ? next.level : undefined,
        hour: nextHour === null || nextHour === undefined ? undefined : nextHour,
        page: next.page && next.page > 1 ? next.page : undefined,
      },
      replace: true,
    });
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateSearch({
      day: activeDay,
      query: queryInput,
      level: activeLevel,
      page: 1,
    });
  }

  const hasLogs = data.availableDays.length > 0;
  const selectedDayLabel = data.selectedDay ? formatDate(data.selectedDay) : "No log day selected";
  const startCount = data.totalMatched === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const endCount = Math.min(data.totalMatched, data.page * data.pageSize);

  return (
    <PageHeader
      icon={TerminalSquare}
      label="Logs"
      title="Daily log"
      highlight="viewer"
      glows={false}
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAutoPoll((v) => !v)}
          className="min-w-[130px] gap-2 px-3"
          title={autoPoll ? "Pause auto-refresh" : "Resume auto-refresh"}
        >
          {autoPoll ? <Pause className="size-4" /> : <Play className="size-4" />}
          {autoPoll ? "Auto-refresh" : "Paused"}
        </Button>
      }
    >
      <section className="surface-card mb-6 p-4 sm:p-5">
        <form className="grid gap-3 lg:grid-cols-[220px_180px_minmax(0,1fr)_auto_auto]" onSubmit={submitSearch}>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Day</p>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2 font-normal" disabled={!hasLogs}>
                  <CalendarDays className="size-4 text-[var(--teal)]" />
                  <span className="truncate">{hasLogs ? selectedDayLabel : "No log files"}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                <div className="mb-3 flex items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
                  <div>
                    <p className="font-semibold uppercase tracking-[0.12em] text-foreground">Select day</p>
                    <p>Highlighted days have logs</p>
                  </div>
                  <Badge variant="outline" className="gap-2 rounded-md px-2 py-1 font-normal">
                    <span className="size-2 rounded-full bg-[var(--teal)]" />
                    {data.availableDays.length}
                  </Badge>
                </div>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  defaultMonth={selectedDate ?? dayjs(data.availableDays[0]).toDate()}
                  onSelect={(date) => {
                    if (!date) {
                      return;
                    }

                    const nextDay = dayjs(date).format("YYYY-MM-DD");
                    if (!availableDaySet.has(nextDay)) {
                      return;
                    }

                    setCalendarOpen(false);
                    updateSearch({
                      day: nextDay,
                      query: data.filters.query,
                      level: activeLevel,
                      hour: null,
                      page: 1,
                    });
                  }}
                  disabled={(date) => !availableDaySet.has(dayjs(date).format("YYYY-MM-DD"))}
                  modifiers={{
                    hasLogs: (date) => availableDaySet.has(dayjs(date).format("YYYY-MM-DD")),
                  }}
                  modifiersClassNames={{
                    hasLogs:
                      "rounded-md bg-[var(--teal)]/12 text-[var(--teal)] ring-1 ring-[var(--teal)]/25 hover:bg-[var(--teal)]/18",
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Level</p>
            <Select
              value={activeLevel}
              onValueChange={(value) => {
                updateSearch({
                  day: activeDay,
                  query: data.filters.query,
                  level: value,
                  page: 1,
                });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All levels" />
              </SelectTrigger>
              <SelectContent>
                {LEVEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Search</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder="Search message, error, or JSON fields"
                className="pl-9"
                disabled={!hasLogs}
              />
            </div>
          </div>

          <Button type="submit" className="self-end" disabled={!hasLogs}>
            Search
          </Button>
          <Button
            type="button"
            variant="outline"
            className="self-end"
            disabled={!hasLogs || !data.filters.query}
            onClick={() => {
              setQueryInput("");
              updateSearch({
                day: activeDay,
                query: undefined,
                level: activeLevel,
                page: 1,
              });
            }}
          >
            Clear
          </Button>
        </form>
      </section>

      {hasLogs ? (
        <>
          <HourSparkline
            buckets={data.hourlyBuckets}
            activeHour={activeHour}
            onSelectHour={(hour) => updateSearch({ day: activeDay, hour, page: 1 })}
          />
          <section className="surface-card mt-3 overflow-hidden">
            <div
              className="relative w-full overflow-hidden"
              style={{ height: 3, background: "var(--line)" }}
              aria-hidden="true"
              title={autoPoll ? `Refreshing every ${POLL_INTERVAL_MS / 1000}s` : "Auto-refresh paused"}
            >
              {autoPoll && <PollShrinkBar key={pollCycle} duration={POLL_INTERVAL_MS} />}
            </div>
            <div className="flex flex-col gap-2 border-b border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <div>
                Showing {startCount.toLocaleString()}-{endCount.toLocaleString()} of {data.totalMatched.toLocaleString()}{" "}
                matched entries.
              </div>
              <div className="flex flex-wrap gap-2">
                {LEVEL_OPTIONS.filter(isSpecificLevelOption).map((option) => {
                  const isActive = activeLevel === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        updateSearch({
                          day: activeDay,
                          query: data.filters.query,
                          level: isActive ? "all" : option.value,
                          page: 1,
                        })
                      }
                      title={isActive ? `Clear ${option.label} filter` : `Filter by ${option.label}`}
                      className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs font-normal transition-colors ${
                        isActive ? "border-foreground/40 bg-muted text-foreground" : "border-border hover:bg-muted/60"
                      }`}
                    >
                      <span className={levelDotClass(option.value)} />
                      {option.label} {data.matchedLevelCounts[option.value].toLocaleString()}
                    </button>
                  );
                })}
              </div>
            </div>

            {data.entries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Time</TableHead>
                    <TableHead className="w-[110px]">Level</TableHead>
                    <TableHead>Entry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.entries.map((entry) => {
                    const isExpanded = expandedIds.has(entry.id);
                    const isError = entry.level === "error" || entry.level === "fatal";
                    const isFresh = freshIds.has(entry.id);
                    return (
                      <TableRow
                        key={entry.id}
                        onClick={() =>
                          setExpandedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(entry.id)) {
                              next.delete(entry.id);
                            } else {
                              next.add(entry.id);
                            }
                            return next;
                          })
                        }
                        className={`log-row cursor-pointer ${isError ? "log-row-error" : ""} ${
                          isFresh ? "log-row-fresh" : ""
                        }`}
                      >
                        <TableCell className="align-top text-xs text-muted-foreground">
                          <div className="font-medium text-foreground">{formatLogTime(entry.timestamp)}</div>
                          <div>
                            {entry.sourceFile}:{entry.line}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge variant="outline" className={levelBadgeClass(entry.level)}>
                            <span className={levelDotClass(entry.level)} />
                            {entry.level}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-0 align-top whitespace-normal">
                          <div className="font-medium text-foreground">{entry.message}</div>
                          {entry.contextItems.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              {entry.contextItems.map((item) => (
                                <span
                                  key={`${entry.id}:${item.key}`}
                                  className="rounded-md border border-border bg-muted/40 px-2 py-1"
                                >
                                  <span className="font-medium text-foreground">{item.key}</span>: {item.value}
                                </span>
                              ))}
                            </div>
                          )}
                          {entry.errorMessage && <p className="mt-2 text-sm text-destructive">{entry.errorMessage}</p>}
                          {isExpanded && <JsonBlock json={entry.detailsJson} />}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="px-6 py-16 text-center">
                <h2 className="text-lg font-semibold text-foreground">No matching entries</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try a different day, clear the search, or widen the level filter.
                </p>
              </div>
            )}
          </section>

          <PaginationControls
            page={data.page}
            totalPages={data.totalPages}
            onPageChange={(page) =>
              updateSearch({
                day: activeDay,
                query: data.filters.query,
                level: activeLevel,
                page,
              })
            }
          />
        </>
      ) : (
        <section className="surface-card px-6 py-16 text-center">
          <h2 className="text-lg font-semibold text-foreground">No log files yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Aether is configured to rotate structured logs into `./logs` once the app starts writing them.
          </p>
        </section>
      )}
    </PageHeader>
  );
}

function HourSparkline({
  buckets,
  activeHour,
  onSelectHour,
}: {
  buckets: import("#/lib/log-viewer.functions").HourBucket[];
  activeHour: number | null;
  onSelectHour: (hour: number | null) => void;
}) {
  const max = Math.max(1, ...buckets.map((b) => b.total));
  const indexed = buckets.map((b, i) => ({ ...b, hour: i }));
  return (
    <section className="surface-card mt-6 px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Volume by hour</span>
        {activeHour !== null && (
          <button
            type="button"
            onClick={() => onSelectHour(null)}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs hover:bg-muted/60"
          >
            <X className="size-3" />
            Filter: {String(activeHour).padStart(2, "0")}:00
          </button>
        )}
      </div>
      <div className="flex h-12 items-end gap-[2px]">
        {indexed.map((bucket) => {
          const hour = bucket.hour;
          const isActive = activeHour === hour;
          const isDimmed = activeHour !== null && !isActive;
          const heightPct = bucket.total === 0 ? 0 : Math.max(6, (bucket.total / max) * 100);
          const hasErrors = bucket.errors > 0;
          const label = `${String(hour).padStart(2, "0")}:00 · ${bucket.total.toLocaleString()} ${bucket.total === 1 ? "entry" : "entries"}${bucket.errors > 0 ? ` · ${bucket.errors} error${bucket.errors === 1 ? "" : "s"}` : ""}`;
          return (
            <button
              key={hour}
              type="button"
              title={label}
              aria-label={label}
              onClick={() => onSelectHour(isActive ? null : hour)}
              className="group relative flex h-full flex-1 flex-col justify-end"
            >
              <div
                className="w-full rounded-sm transition-all duration-150 group-hover:brightness-110"
                style={{
                  height: `${heightPct}%`,
                  background: hasErrors ? "var(--destructive)" : "var(--teal)",
                  opacity: bucket.total === 0 ? 0.18 : isDimmed ? 0.3 : isActive ? 1 : 0.75,
                  outline: isActive ? "1px solid var(--foreground)" : undefined,
                  outlineOffset: 1,
                }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
    </section>
  );
}

function JsonBlock({ json }: { json: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative mt-3">
      <button
        type="button"
        onClick={async (e) => {
          e.stopPropagation();
          try {
            await navigator.clipboard.writeText(json);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          } catch {
            // ignore
          }
        }}
        title="Copy JSON"
        className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md border border-border bg-background/90 px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {copied ? <Check className="size-3 text-[var(--teal)]" /> : <Copy className="size-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        className="max-h-72 cursor-text overflow-auto rounded-md border border-border bg-background/80 p-3 pr-16 text-xs leading-5 text-muted-foreground"
      >
        {json}
      </pre>
    </div>
  );
}

function PollShrinkBar({ duration }: { duration: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const anim = el.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], {
      duration,
      easing: "linear",
      fill: "forwards",
    });
    return () => anim.cancel();
  }, [duration]);
  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--teal)",
        transformOrigin: "center",
      }}
    />
  );
}

function formatLogTime(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

function levelBadgeClass(level: LogLevel) {
  if (level === "fatal" || level === "error") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }

  if (level === "warn") {
    return "border-[var(--coral)]/30 bg-[var(--coral)]/10 text-[var(--coral)]";
  }

  if (level === "debug" || level === "trace") {
    return "border-border bg-muted/60 text-muted-foreground";
  }

  return "border-[var(--teal)]/30 bg-[var(--teal)]/10 text-[var(--teal)]";
}

function levelDotClass(level: LogLevel) {
  if (level === "fatal" || level === "error") {
    return "size-2 rounded-full bg-destructive";
  }

  if (level === "warn") {
    return "size-2 rounded-full bg-[var(--coral)]";
  }

  if (level === "debug" || level === "trace") {
    return "size-2 rounded-full bg-muted-foreground";
  }

  return "size-2 rounded-full bg-[var(--teal)]";
}

function isSpecificLevelOption(option: (typeof LEVEL_OPTIONS)[number]): option is { value: LogLevel; label: string } {
  return option.value !== "all";
}
