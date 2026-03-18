import dayjs from "dayjs";
import { CalendarIcon } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { cn } from "#/lib/utils";

// ── Built-in presets ────────────────────────────────────────────────

export const DATE_RANGE_PRESETS = [
  { id: "last-week", label: "Last week" },
  { id: "7d", label: "Last 7 days" },
  { id: "month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "all", label: "All time" },
] as const;

export type DateRangePresetId = (typeof DATE_RANGE_PRESETS)[number]["id"];

/**
 * Resolves a preset id to concrete from/to date strings (YYYY-MM-DD).
 * Returns `undefined` for both dates when the range is unbounded ("all").
 */
export function resolveDatePreset(presetId: string): {
  from?: string;
  to?: string;
} {
  const today = dayjs().startOf("day");

  switch (presetId) {
    case "last-week": {
      const lastSunday = today.day(0).subtract(7, "day");
      return {
        from: lastSunday.format("YYYY-MM-DD"),
        to: lastSunday.add(6, "day").format("YYYY-MM-DD"),
      };
    }
    case "month":
      return {
        from: today.startOf("month").format("YYYY-MM-DD"),
        to: today.format("YYYY-MM-DD"),
      };
    case "last-month": {
      const prev = today.subtract(1, "month");
      return {
        from: prev.startOf("month").format("YYYY-MM-DD"),
        to: prev.endOf("month").format("YYYY-MM-DD"),
      };
    }
    case "all":
      return {};
    default: {
      // Numeric day presets: "7d", "30d", "90d", etc.
      const match = presetId.match(/^(\d+)d$/);
      const days = match ? Number(match[1]) : 30;
      return {
        from: today.subtract(days - 1, "day").format("YYYY-MM-DD"),
        to: today.format("YYYY-MM-DD"),
      };
    }
  }
}

// ── Component ───────────────────────────────────────────────────────

interface DateRangePickerProps {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  /** Show the built-in preset sidebar. Defaults to true. */
  showPresets?: boolean;
  /** Preset to highlight & resolve on first mount when no from/to is provided. */
  defaultPreset?: DateRangePresetId;
  onChange: (value: { from?: string; to?: string }) => void;
}

export function DateRangePicker({ from, to, showPresets = true, defaultPreset = "30d", onChange }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [activePreset, setActivePreset] = React.useState<string | undefined>(!from && !to ? defaultPreset : undefined);

  // Resolve the default preset on mount when no dates are provided
  const didInit = React.useRef(false);
  React.useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if (!from && !to && defaultPreset) {
      onChange(resolveDatePreset(defaultPreset));
    }
  }, [from, to, defaultPreset, onChange]);

  const fromDate = from ? dayjs(from).toDate() : undefined;
  const toDate = to ? dayjs(to).toDate() : undefined;

  const selected: DateRange | undefined = fromDate || toDate ? { from: fromDate, to: toDate ?? fromDate } : undefined;

  function handleRangeSelect(range: DateRange | undefined) {
    setActivePreset(undefined);
    onChange({
      from: range?.from ? dayjs(range.from).format("YYYY-MM-DD") : undefined,
      to: range?.to ? dayjs(range.to).format("YYYY-MM-DD") : undefined,
    });
  }

  function handlePreset(preset: (typeof DATE_RANGE_PRESETS)[number]) {
    setActivePreset(preset.id);
    onChange(resolveDatePreset(preset.id));
    setOpen(false);
  }

  const label = React.useMemo(() => {
    if (activePreset) {
      const p = DATE_RANGE_PRESETS.find((p) => p.id === activePreset);
      if (p) return p.label;
    }
    if (from && to) {
      const f = dayjs(from);
      const t = dayjs(to);
      if (f.year() === t.year()) {
        return `${f.format("MMM D")} – ${t.format("MMM D, YYYY")}`;
      }
      return `${f.format("MMM D, YYYY")} – ${t.format("MMM D, YYYY")}`;
    }
    if (from) return `${dayjs(from).format("MMM D, YYYY")} – ...`;
    if (to) return `... – ${dayjs(to).format("MMM D, YYYY")}`;
    return "Select date range";
  }, [from, to, activePreset]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start gap-2 text-left font-normal",
            !from && !to && !activePreset && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="size-3.5" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {showPresets && (
            <div className="flex flex-col gap-1 border-r p-3">
              {DATE_RANGE_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  variant={activePreset === preset.id ? "default" : "ghost"}
                  size="sm"
                  className="justify-start text-xs"
                  onClick={() => handlePreset(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          )}
          <div className="p-3">
            <Calendar
              mode="range"
              selected={selected}
              onSelect={handleRangeSelect}
              numberOfMonths={2}
              defaultMonth={toDate ? dayjs(toDate).subtract(1, "month").toDate() : dayjs().subtract(1, "month").toDate()}
              disabled={{ after: new Date() }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
