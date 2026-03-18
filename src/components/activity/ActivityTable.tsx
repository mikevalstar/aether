import { Bell, Bot, Clock, Cog, FileText, History, PenLine, Play, Timer } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import type { ActivityListItem } from "#/lib/activity.functions";
import { formatRelativeTime } from "./format-relative-time";

export function ActivityTable({ items, onItemClick }: { items: ActivityListItem[]; onItemClick: (id: string) => void }) {
  if (items.length === 0) {
    return <ActivityEmptyState />;
  }

  return (
    <section className="surface-card overflow-hidden">
      <table className="min-w-full table-fixed border-separate border-spacing-0 text-sm">
        <colgroup>
          <col className="w-[180px]" />
          <col className="w-[100px]" />
          <col />
          <col className="w-[120px]" />
        </colgroup>
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="border-b border-border px-4 py-3 font-semibold">When</th>
            <th className="border-b border-border px-4 py-3 font-semibold">Type</th>
            <th className="border-b border-border px-4 py-3 font-semibold">Summary</th>
            <th className="border-b border-border px-4 py-3 font-semibold">Source</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => onItemClick(item.id)}
            >
              <td className="border-b border-border/50 px-4 py-3 text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  {formatRelativeTime(item.createdAt)}
                </div>
              </td>
              <td className="border-b border-border/50 px-4 py-3">
                <TypeBadge type={item.type} />
              </td>
              <td className="border-b border-border/50 px-4 py-3">
                <span className="font-medium">{item.summary}</span>
                {item.fileChangeDetail && (
                  <span className="ml-2 font-mono text-xs text-muted-foreground">{item.fileChangeDetail.filePath}</span>
                )}
              </td>
              <td className="border-b border-border/50 px-4 py-3">
                {item.fileChangeDetail && <SourceBadge source={item.fileChangeDetail.changeSource} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

const TYPE_CONFIG: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  file_change: { icon: FileText, label: "File", color: "var(--teal)" },
  cron_task: { icon: Timer, label: "Cron", color: "var(--coral)" },
  workflow: { icon: Play, label: "Workflow", color: "oklch(0.65 0.15 270)" },
  system_task: { icon: Cog, label: "System", color: "oklch(0.60 0.12 140)" },
  ai_notification: { icon: Bell, label: "Notification", color: "oklch(0.65 0.14 25)" },
};

function TypeBadge({ type }: { type: string }) {
  const config = TYPE_CONFIG[type];
  if (!config) {
    return (
      <Badge variant="outline" className="text-xs">
        {type}
      </Badge>
    );
  }
  const Icon = config.icon;
  return (
    <Badge
      className="gap-1 py-0 text-xs border-transparent"
      style={{
        backgroundColor: `color-mix(in oklch, ${config.color} 12%, transparent)`,
        color: config.color,
      }}
    >
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}

function SourceBadge({ source }: { source: string }) {
  if (source === "ai") {
    return (
      <Badge className="gap-1 bg-[var(--teal)]/10 py-0 text-xs text-[var(--teal)] hover:bg-[var(--teal)]/15 border-[var(--teal)]/20">
        <Bot className="size-3" />
        AI
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 bg-[var(--coral)]/10 py-0 text-xs text-[var(--coral)] hover:bg-[var(--coral)]/15 border-[var(--coral)]/20">
      <PenLine className="size-3" />
      Manual
    </Badge>
  );
}

function ActivityEmptyState() {
  return (
    <section className="surface-card flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-[var(--teal)]/10 text-[var(--teal)]">
        <History className="size-6" strokeWidth={1.5} />
      </div>
      <h2 className="text-lg font-semibold">No activity yet</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        File changes from AI tools and manual edits will appear here.
      </p>
    </section>
  );
}
