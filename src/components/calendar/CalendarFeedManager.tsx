import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { FieldRow } from "#/components/ui/field-row";
import { Input } from "#/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import type { CalendarFeed } from "#/lib/calendar/types";

const SYNC_INTERVALS = [
  { label: "1 min", value: 1 },
  { label: "5 min", value: 5 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "6 hours", value: 360 },
  { label: "12 hours", value: 720 },
  { label: "24 hours", value: 1440 },
];

const PRESET_COLORS = [
  "#0d9488", // teal
  "#f97316", // orange
  "#8b5cf6", // violet
  "#ef4444", // red
  "#3b82f6", // blue
  "#22c55e", // green
  "#ec4899", // pink
  "#eab308", // yellow
];

type Props = {
  feeds: CalendarFeed[];
  onChange: (feeds: CalendarFeed[]) => void;
};

export function CalendarFeedManager({ feeds, onChange }: Props) {
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    const newFeed: CalendarFeed = {
      id: crypto.randomUUID().slice(0, 12),
      name: "",
      url: "",
      color: PRESET_COLORS[feeds.length % PRESET_COLORS.length],
      syncInterval: 60,
    };
    onChange([...feeds, newFeed]);
    setIsAdding(true);
  };

  const handleUpdate = (index: number, updates: Partial<CalendarFeed>) => {
    const updated = feeds.map((f, i) => (i === index ? { ...f, ...updates } : f));
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    onChange(feeds.filter((_, i) => i !== index));
  };

  return (
    <div className="grid gap-3">
      {feeds.map((feed, index) => (
        <FeedEntry
          key={feed.id}
          feed={feed}
          autoFocus={isAdding && index === feeds.length - 1}
          onUpdate={(updates) => handleUpdate(index, updates)}
          onRemove={() => handleRemove(index)}
        />
      ))}

      <Button type="button" variant="outline" size="sm" className="w-fit gap-1.5" onClick={handleAdd}>
        <Plus className="size-3.5" />
        Add calendar feed
      </Button>
    </div>
  );
}

function FeedEntry({
  feed,
  autoFocus,
  onUpdate,
  onRemove,
}: {
  feed: CalendarFeed;
  autoFocus: boolean;
  onUpdate: (updates: Partial<CalendarFeed>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={feed.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="size-6 cursor-pointer rounded border-none bg-transparent"
            title="Feed color"
          />
          <span className="font-mono text-[12px] font-medium tracking-wide text-[var(--ink)]">
            {feed.name || "New feed"}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="grid gap-3">
        <FieldRow label="DISPLAY NAME">
          <Input
            type="text"
            className="font-mono text-[12.5px]"
            value={feed.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Work calendar"
            autoFocus={autoFocus}
          />
        </FieldRow>

        <FieldRow label="ICAL URL">
          <Input
            type="url"
            className="font-mono text-[12.5px]"
            value={feed.url}
            onChange={(e) => onUpdate({ url: e.target.value })}
            placeholder="https://calendar.google.com/calendar/ical/..."
          />
        </FieldRow>

        <FieldRow label="SYNC INTERVAL">
          <Select value={String(feed.syncInterval)} onValueChange={(v) => onUpdate({ syncInterval: Number(v) })}>
            <SelectTrigger className="w-full font-mono text-[12.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SYNC_INTERVALS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>
      </div>
    </div>
  );
}
