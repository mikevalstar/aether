import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import dayjs from "dayjs";
import { CalendarDays, FileSearch, Search, TerminalSquare } from "lucide-react";
import { useEffect, useState } from "react";
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

function LogsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const data = Route.useLoaderData() as LogViewerResult;
  const search = Route.useSearch() as z.infer<typeof logsSearchSchema>;
  const activeDay = search.day ?? data.selectedDay;
  const activeLevel = data.filters.level;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [queryInput, setQueryInput] = useState(data.filters.query);
  const availableDaySet = new Set(data.availableDays);
  const selectedDate = activeDay ? dayjs(activeDay).toDate() : undefined;

  useEffect(() => {
    setQueryInput(data.filters.query);
  }, [data.filters.query]);

  function updateSearch(next: { day?: string; query?: string; level?: string; page?: number }) {
    void navigate({
      search: {
        day: next.day,
        query: next.query?.trim() ? next.query.trim() : undefined,
        level: next.level && next.level !== "all" ? next.level : undefined,
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
      description="Pick a single day, then search and filter structured Pino logs without loading the whole log history at once."
      glows={[
        { color: "var(--teal)", size: "size-[520px]", position: "-right-48 -top-48" },
        { color: "var(--coral)", size: "size-[320px]", position: "-left-32 top-80" },
      ]}
      action={
        <div className="surface-card flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
          <FileSearch className="size-4 text-[var(--coral)]" />
          <span>{selectedDayLabel}</span>
        </div>
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
          <section className="mb-6 grid gap-3 sm:grid-cols-3">
            <LogStatCard label="Entries in day" value={data.totalEntries.toLocaleString()} accent="var(--teal)" />
            <LogStatCard label="Matched filters" value={data.totalMatched.toLocaleString()} accent="var(--coral)" />
            <LogStatCard
              label="Errors + fatals"
              value={(data.matchedLevelCounts.error + data.matchedLevelCounts.fatal).toLocaleString()}
              accent="var(--destructive)"
            />
          </section>

          <section className="surface-card overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <div>
                Showing {startCount.toLocaleString()}-{endCount.toLocaleString()} of {data.totalMatched.toLocaleString()}{" "}
                matched entries.
              </div>
              <div className="flex flex-wrap gap-2">
                {LEVEL_OPTIONS.filter(isSpecificLevelOption).map((option) => (
                  <Badge key={option.value} variant="outline" className="gap-2 rounded-md px-2 py-1 font-normal">
                    <span className={levelDotClass(option.value)} />
                    {option.label} {data.matchedLevelCounts[option.value].toLocaleString()}
                  </Badge>
                ))}
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
                  {data.entries.map((entry) => (
                    <TableRow key={entry.id}>
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
                        <details className="mt-3 rounded-lg border border-border bg-muted/25 p-3">
                          <summary className="cursor-pointer text-sm font-medium text-foreground">
                            View structured JSON
                          </summary>
                          <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-background/80 p-3 text-xs leading-5 text-muted-foreground">
                            {entry.detailsJson}
                          </pre>
                        </details>
                      </TableCell>
                    </TableRow>
                  ))}
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

function LogStatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="surface-card px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight" style={{ color: accent }}>
        {value}
      </div>
    </div>
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
