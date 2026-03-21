import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Activity, FileText, RefreshCw, Sparkles, Workflow, Zap } from "lucide-react";
import type { DashboardActivity } from "#/lib/dashboard.functions";

type Props = {
  items: DashboardActivity[];
};

const TYPE_ICONS: Record<string, typeof Activity> = {
  file_change: FileText,
  cron_task: RefreshCw,
  workflow: Workflow,
  system_task: Zap,
  ai_notification: Sparkles,
};

export function ActivityDigest({ items }: Props) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 pb-2">
      <div className="flex items-center justify-between px-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recent Activity</h3>
        <Link to="/activity" className="text-xs text-[var(--teal)] no-underline hover:underline">
          View all
        </Link>
      </div>
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = TYPE_ICONS[item.type] ?? Activity;
          return (
            <div key={item.id} className="flex items-start gap-2.5 rounded-md px-3 py-1.5 text-sm">
              <Icon className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-foreground">{item.summary}</p>
                <p className="text-[11px] tabular-nums text-muted-foreground">
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
