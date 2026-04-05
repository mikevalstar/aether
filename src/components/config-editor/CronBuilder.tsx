import { Cron } from "croner";
import cronstrue from "cronstrue";
import { AlertCircle, CalendarClock, Code } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Switch } from "#/components/ui/switch";
import { cn } from "#/lib/utils";

type CronBuilderProps = {
  value: string;
  onChange: (cron: string) => void;
  timezone?: string;
};

type Frequency = "minute" | "hourly" | "daily" | "weekly" | "monthly";

const WEEKDAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
] as const;

// ─── Cron parsing ───────────────────────────────────────────────────────

function parseCronToVisual(cron: string): {
  frequency: Frequency;
  minute: string;
  hour: string;
  dayOfWeek: string;
  dayOfMonth: string;
} {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { frequency: "daily", minute: "0", hour: "9", dayOfWeek: "1", dayOfMonth: "1" };
  }

  const [minute, hour, dayOfMonth, , dayOfWeek] = parts;

  // Every minute: * * * * *
  if (minute === "*" && hour === "*") {
    return { frequency: "minute", minute: "0", hour: "0", dayOfWeek: "1", dayOfMonth: "1" };
  }

  // Hourly: M * * * *
  if (hour === "*" && dayOfMonth === "*" && dayOfWeek === "*") {
    return { frequency: "hourly", minute: minute === "*" ? "0" : minute, hour: "0", dayOfWeek: "1", dayOfMonth: "1" };
  }

  // Weekly: M H * * D
  if (dayOfMonth === "*" && dayOfWeek !== "*") {
    return {
      frequency: "weekly",
      minute: minute === "*" ? "0" : minute,
      hour: hour === "*" ? "9" : hour,
      dayOfWeek: dayOfWeek,
      dayOfMonth: "1",
    };
  }

  // Monthly: M H D * *
  if (dayOfMonth !== "*" && dayOfWeek === "*") {
    return {
      frequency: "monthly",
      minute: minute === "*" ? "0" : minute,
      hour: hour === "*" ? "9" : hour,
      dayOfWeek: "1",
      dayOfMonth: dayOfMonth,
    };
  }

  // Daily (default): M H * * *
  return {
    frequency: "daily",
    minute: minute === "*" ? "0" : minute,
    hour: hour === "*" ? "9" : hour,
    dayOfWeek: "1",
    dayOfMonth: "1",
  };
}

function buildCron(frequency: Frequency, minute: string, hour: string, dayOfWeek: string, dayOfMonth: string): string {
  const m = minute || "0";
  const h = hour || "0";

  switch (frequency) {
    case "minute":
      return "* * * * *";
    case "hourly":
      return `${m} * * * *`;
    case "daily":
      return `${m} ${h} * * *`;
    case "weekly":
      return `${m} ${h} * * ${dayOfWeek}`;
    case "monthly":
      return `${m} ${h} ${dayOfMonth} * *`;
  }
}

function getNextRuns(cron: string, count: number, timezone?: string): Date[] {
  try {
    const job = new Cron(cron, { paused: true, timezone: timezone || undefined });
    const runs: Date[] = [];
    let prev: Date | undefined;
    for (let i = 0; i < count; i++) {
      const next = prev ? job.nextRun(prev) : job.nextRun();
      if (!next) break;
      runs.push(next);
      prev = new Date(next.getTime() + 1000);
    }
    job.stop();
    return runs;
  } catch {
    return [];
  }
}

function validateCron(cron: string): string | null {
  try {
    const job = new Cron(cron, { paused: true });
    job.stop();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Invalid cron expression";
  }
}

function formatCronHuman(cron: string): string | null {
  try {
    return cronstrue.toString(cron);
  } catch {
    return null;
  }
}

// ─── Hour/Minute options ────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: `${String(i).padStart(2, "0")}:00`,
}));

const MINUTES = Array.from({ length: 60 }, (_, i) => ({
  value: String(i),
  label: String(i).padStart(2, "0"),
}));

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

// ─── Component ──────────────────────────────────────────────────────────

export function CronBuilder({ value, onChange, timezone }: CronBuilderProps) {
  const [advanced, setAdvanced] = useState(false);
  const [rawCron, setRawCron] = useState(value);
  const [visual, setVisual] = useState(() => parseCronToVisual(value));

  // Sync raw cron when value prop changes externally
  useEffect(() => {
    setRawCron(value);
    setVisual(parseCronToVisual(value));
  }, [value]);

  const handleVisualChange = useCallback(
    (update: Partial<typeof visual>) => {
      const next = { ...visual, ...update };
      setVisual(next);
      const cron = buildCron(next.frequency, next.minute, next.hour, next.dayOfWeek, next.dayOfMonth);
      setRawCron(cron);
      onChange(cron);
    },
    [visual, onChange],
  );

  const handleRawChange = useCallback(
    (raw: string) => {
      setRawCron(raw);
      const err = validateCron(raw);
      if (!err) {
        setVisual(parseCronToVisual(raw));
        onChange(raw);
      }
    },
    [onChange],
  );

  const cronError = useMemo(() => validateCron(rawCron), [rawCron]);
  const humanReadable = useMemo(() => formatCronHuman(rawCron), [rawCron]);
  const nextRuns = useMemo(() => (cronError ? [] : getNextRuns(rawCron, 3, timezone)), [rawCron, cronError, timezone]);

  const dateFormatter = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone || undefined,
    });
  }, [timezone]);

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code className="size-3.5 text-[var(--ink-soft)]" />
          <Label htmlFor="cron-advanced" className="text-xs text-[var(--ink-soft)]">
            Advanced (raw cron)
          </Label>
        </div>
        <Switch id="cron-advanced" checked={advanced} onCheckedChange={setAdvanced} className="scale-75" />
      </div>

      {advanced ? (
        /* ─── Raw cron input ─── */
        <div className="space-y-2">
          <Input
            value={rawCron}
            onChange={(e) => handleRawChange(e.target.value)}
            placeholder="* * * * *"
            className={cn("font-mono text-sm", cronError && "border-destructive")}
          />
          {cronError && (
            <p className="flex items-center gap-1.5 text-xs text-destructive-foreground">
              <AlertCircle className="size-3" />
              {cronError}
            </p>
          )}
        </div>
      ) : (
        /* ─── Visual builder ─── */
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Frequency</Label>
              <Select value={visual.frequency} onValueChange={(v) => handleVisualChange({ frequency: v as Frequency })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minute">Every minute</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {visual.frequency !== "minute" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Minute</Label>
                <Select value={visual.minute} onValueChange={(v) => handleVisualChange({ minute: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MINUTES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        :{m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {(visual.frequency === "daily" || visual.frequency === "weekly" || visual.frequency === "monthly") && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Hour</Label>
                <Select value={visual.hour} onValueChange={(v) => handleVisualChange({ hour: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => (
                      <SelectItem key={h.value} value={h.value}>
                        {h.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {visual.frequency === "weekly" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Day of week</Label>
                  <Select value={visual.dayOfWeek} onValueChange={(v) => handleVisualChange({ dayOfWeek: v })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {visual.frequency === "monthly" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Day of month</Label>
                  <Select value={visual.dayOfMonth} onValueChange={(v) => handleVisualChange({ dayOfMonth: v })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_MONTH.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Show raw expression */}
          <p className="font-mono text-[11px] text-[var(--ink-soft)]/60">
            cron: <code>{rawCron}</code>
          </p>
        </div>
      )}

      {/* Human-readable + next runs */}
      {humanReadable && !cronError && (
        <div className="rounded-md border border-[var(--line)] bg-[var(--surface-alt)] px-3 py-2.5 space-y-2">
          <p className="text-sm font-medium text-[var(--ink)]">{humanReadable}</p>
          {nextRuns.length > 0 && (
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]/60">Next runs</p>
              {nextRuns.map((date) => (
                <p key={date.toISOString()} className="text-xs text-[var(--ink-soft)]">
                  <CalendarClock className="mr-1 inline size-3" />
                  {dateFormatter.format(date)}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
