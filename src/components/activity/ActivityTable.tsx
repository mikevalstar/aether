import { Bell, Bot, Clock, Cog, FileText, History, PenLine, Play, Puzzle, Timer } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { DataTable, type DataTableColumn } from "#/components/ui/data-table";
import type { ActivityListItem } from "#/lib/activity.functions";
import { getPlugin } from "#/plugins";
import { formatRelativeTime } from "./format-relative-time";

export function ActivityTable({ items, onItemClick }: { items: ActivityListItem[]; onItemClick: (id: string) => void }) {
  if (items.length === 0) {
    return <ActivityEmptyState />;
  }

  const columns: DataTableColumn<ActivityListItem>[] = [
    {
      key: "when",
      header: "When",
      mono: true,
      headerClassName: "w-[170px]",
      cell: (item) => (
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--ink)]">
          <Clock className="size-3 text-[var(--ink-soft)]" />
          {formatRelativeTime(item.createdAt)}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      headerClassName: "w-[120px]",
      cell: (item) => <TypeBadge type={item.type} />,
    },
    {
      key: "summary",
      header: "Summary",
      cell: (item) => (
        <div className="min-w-0">
          <span className="font-medium text-[var(--ink)]">{item.summary}</span>
          {item.fileChangeDetail && (
            <span className="ml-2 font-mono text-[11px] text-[var(--ink-soft)]">{item.fileChangeDetail.filePath}</span>
          )}
        </div>
      ),
    },
    {
      key: "source",
      header: "Source",
      headerClassName: "w-[110px]",
      cell: (item) => (item.fileChangeDetail ? <SourceBadge source={item.fileChangeDetail.changeSource} /> : null),
    },
  ];

  return (
    <DataTable
      title="Activity"
      count={items.length}
      data={items}
      columns={columns}
      rowKey={(item) => item.id}
      showChevron
      onRowClick={(item) => onItemClick(item.id)}
    />
  );
}

const TYPE_CONFIG: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  file_change: { icon: FileText, label: "File", color: "var(--teal)" },
  cron_task: { icon: Timer, label: "Cron", color: "var(--coral)" },
  workflow: { icon: Play, label: "Workflow", color: "oklch(0.65 0.15 270)" },
  system_task: { icon: Cog, label: "System", color: "oklch(0.60 0.12 140)" },
  ai_notification: { icon: Bell, label: "Notification", color: "oklch(0.65 0.14 25)" },
};

const PLUGIN_COLORS = [
  "oklch(0.65 0.15 300)",
  "oklch(0.65 0.14 200)",
  "oklch(0.60 0.16 50)",
  "oklch(0.65 0.13 160)",
  "oklch(0.60 0.15 350)",
];

function resolvePluginType(type: string): { icon: typeof FileText; label: string; color: string } | null {
  const parts = type.split(":");
  if (parts.length < 3 || parts[0] !== "plugin") return null;

  const pluginId = parts[1];
  const actType = parts.slice(2).join(":");
  const plugin = getPlugin(pluginId);
  if (!plugin) return null;

  const activityDef = plugin.activityTypes?.find((at) => at.type === actType);
  const label = activityDef?.label ?? actType;
  const icon = activityDef?.icon ?? plugin.meta.icon ?? Puzzle;

  let hash = 0;
  for (let i = 0; i < pluginId.length; i++) hash = (hash * 31 + pluginId.charCodeAt(i)) | 0;
  const color = PLUGIN_COLORS[Math.abs(hash) % PLUGIN_COLORS.length];

  return { icon, label, color };
}

function TypeBadge({ type }: { type: string }) {
  const config = TYPE_CONFIG[type] ?? resolvePluginType(type);
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
      className="gap-1 border-transparent py-0 text-xs"
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
      <Badge className="gap-1 border-[var(--teal)]/20 bg-[var(--teal)]/10 py-0 text-xs text-[var(--teal)] hover:bg-[var(--teal)]/15">
        <Bot className="size-3" />
        AI
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 border-[var(--coral)]/20 bg-[var(--coral)]/10 py-0 text-xs text-[var(--coral)] hover:bg-[var(--coral)]/15">
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
      <p className="mt-2 max-w-md text-sm text-[var(--ink-soft)]">
        File changes from AI tools and manual edits will appear here.
      </p>
    </section>
  );
}
