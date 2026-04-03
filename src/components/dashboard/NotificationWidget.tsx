import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Bell, BellRing, Info, OctagonAlert, ShieldAlert } from "lucide-react";
import type { DashboardNotificationSummary } from "#/lib/dashboard.functions";

type Props = {
  notifications: DashboardNotificationSummary;
};

const LEVEL_CONFIG: Record<string, { icon: typeof Info; color: string; label: string }> = {
  critical: { icon: OctagonAlert, color: "text-red-500", label: "Critical" },
  high: { icon: AlertTriangle, color: "text-orange-500", label: "High" },
  medium: { icon: Bell, color: "text-yellow-500", label: "Medium" },
  error: { icon: ShieldAlert, color: "text-red-700 dark:text-red-400", label: "Error" },
  low: { icon: BellRing, color: "text-slate-500", label: "Low" },
  info: { icon: Info, color: "text-blue-500", label: "Info" },
};

/** Display order for count badges — most severe first */
const COUNT_ORDER = ["critical", "error", "high", "medium", "low", "info"];

export function NotificationWidget({ notifications }: Props) {
  const { items, counts, unreadTotal } = notifications;

  if (items.length === 0) {
    return null;
  }

  // Build count badges for levels that have unread notifications
  const activeCounts = COUNT_ORDER.filter((level) => counts[level] && counts[level] > 0);

  return (
    <div className="space-y-2 pb-2">
      <div className="flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Notifications</h3>
          {unreadTotal > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-[var(--coral)] text-[10px] font-bold text-white">
              {unreadTotal > 9 ? "9+" : unreadTotal}
            </span>
          )}
        </div>
        <Link to="/notifications" className="text-xs text-[var(--teal)] no-underline hover:underline">
          View all
        </Link>
      </div>

      {/* Level count badges */}
      {activeCounts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3">
          {activeCounts.map((level) => {
            const config = LEVEL_CONFIG[level];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <Link
                key={level}
                to="/notifications"
                search={{ level }}
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium no-underline bg-muted/50 ${config.color}`}
              >
                <Icon className="size-3" />
                {counts[level]} {config.label}
              </Link>
            );
          })}
        </div>
      )}

      {/* Recent notifications */}
      <div className="space-y-0.5">
        {items.map((n) => {
          const config = LEVEL_CONFIG[n.level] ?? LEVEL_CONFIG.info;
          const Icon = config.icon;
          const content = (
            <div
              key={n.id}
              className={`flex items-start gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-muted/50 ${
                !n.read ? "bg-[var(--teal-subtle)]" : ""
              }`}
            >
              <Icon className={`mt-0.5 size-3 shrink-0 ${config.color}`} />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-xs ${!n.read ? "font-semibold text-foreground" : "text-foreground"}`}>
                  {n.title}
                </p>
                {n.body && <p className="truncate text-[11px] text-muted-foreground">{n.body}</p>}
                <p className="text-[11px] tabular-nums text-muted-foreground">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          );

          if (n.link) {
            return (
              <Link key={n.id} to={n.link} className="block no-underline text-inherit">
                {content}
              </Link>
            );
          }
          return <div key={n.id}>{content}</div>;
        })}
      </div>
    </div>
  );
}
