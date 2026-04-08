import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { AlarmClock, AlertTriangle, Ban, CheckCircle2, Clock, Info, Trash2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { PageHeader } from "#/components/PageHeader";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { toast } from "#/components/ui/sonner";
import { getSession } from "#/lib/auth.functions";
import {
  cancelScheduledNotification,
  getScheduledNotifications,
  type ScheduledNotificationListResult,
} from "#/lib/scheduled-notifications.functions";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

const searchSchema = z.object({
  status: z.enum(["pending", "sent", "cancelled", "failed", "all"]).optional(),
});

export const Route = createFileRoute("/scheduled-notifications")({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  loaderDeps: ({ search }) => ({ status: search.status }),
  loader: async ({ deps }) => {
    return await getScheduledNotifications({ data: { status: deps.status } });
  },
  component: ScheduledNotificationsPage,
});

const STATUS_FILTERS = [
  { value: "pending", label: "Pending" },
  { value: "sent", label: "Sent" },
  { value: "cancelled", label: "Cancelled" },
  { value: "failed", label: "Failed" },
  { value: "all", label: "All" },
] as const;

const LEVEL_STYLES: Record<string, string> = {
  info: "text-blue-500 bg-blue-500/10",
  low: "text-slate-500 bg-slate-500/10",
  medium: "text-yellow-600 bg-yellow-500/10",
  high: "text-orange-600 bg-orange-500/10",
  critical: "text-red-600 bg-red-500/10",
  error: "text-red-700 bg-red-700/10",
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: typeof Clock; className: string }> = {
    pending: { label: "Pending", icon: Clock, className: "text-teal-700 bg-teal/10" },
    sent: { label: "Sent", icon: CheckCircle2, className: "text-emerald-600 bg-emerald-500/10" },
    cancelled: { label: "Cancelled", icon: Ban, className: "text-muted-foreground bg-muted" },
    failed: { label: "Failed", icon: AlertTriangle, className: "text-red-600 bg-red-500/10" },
  };
  const cfg = map[status] ?? { label: status, icon: Info, className: "bg-muted text-muted-foreground" };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      <Icon className="size-3" />
      {cfg.label}
    </span>
  );
}

function ScheduledNotificationsPage() {
  const router = useRouter();
  const data = Route.useLoaderData() as ScheduledNotificationListResult;
  const search = Route.useSearch();
  const activeStatus = search.status ?? "pending";
  const [busy, setBusy] = useState<string | null>(null);

  async function handleCancel(id: string) {
    setBusy(id);
    try {
      const result = await cancelScheduledNotification({ data: { id } });
      if (result.success) {
        toast.success("Scheduled notification cancelled");
        void router.invalidate();
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setBusy(null);
    }
  }

  return (
    <PageHeader
      icon={AlarmClock}
      label="System"
      title="Scheduled"
      highlight="Notifications"
      description="Reminders the AI (or system) has scheduled for later delivery. You can cancel any pending one here."
    >
      {/* Counts summary */}
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <Badge variant="outline" className="gap-1">
          <Clock className="size-3 text-teal" />
          {data.counts.pending} pending
        </Badge>
        <Badge variant="outline" className="gap-1">
          <CheckCircle2 className="size-3 text-emerald-500" />
          {data.counts.sent} sent
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Ban className="size-3 text-muted-foreground" />
          {data.counts.cancelled} cancelled
        </Badge>
        <Badge variant="outline" className="gap-1">
          <AlertTriangle className="size-3 text-red-500" />
          {data.counts.failed} failed
        </Badge>
      </div>

      {/* Status filter */}
      <div className="mb-4 inline-flex rounded-md border border-border overflow-hidden">
        {STATUS_FILTERS.map((filter) => (
          <Link
            key={filter.value}
            to="/scheduled-notifications"
            search={{ status: filter.value === "pending" ? undefined : filter.value }}
            className={`px-3 py-1 text-sm font-medium transition-colors border-r border-border last:border-r-0 no-underline ${
              activeStatus === filter.value
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {/* List */}
      {data.items.length === 0 ? (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          No {activeStatus === "all" ? "" : activeStatus} scheduled notifications.
        </div>
      ) : (
        <div className="surface-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Title</th>
                <th className="px-3 py-2 text-left font-medium">Level</th>
                <th className="px-3 py-2 text-left font-medium">Scheduled for</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const tz = item.timezone || dayjs.tz.guess();
                const when = dayjs.utc(item.scheduledAt).tz(tz);
                const isFuture = when.valueOf() > Date.now();
                return (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium text-foreground">{item.title}</div>
                      {item.body && <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{item.body}</div>}
                      {item.pushToPhone && (
                        <div className="mt-1 text-[10px] uppercase tracking-wider text-coral">Pushes to phone</div>
                      )}
                      {item.lastError && <div className="mt-1 text-xs text-red-500">Error: {item.lastError}</div>}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span
                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${LEVEL_STYLES[item.level] ?? LEVEL_STYLES.low}`}
                      >
                        {item.level}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top text-xs">
                      <div className="font-mono">{when.format("YYYY-MM-DD HH:mm")}</div>
                      <div className="text-muted-foreground">
                        {tz} · {isFuture ? when.fromNow() : `${when.fromNow()} (past)`}
                      </div>
                      {item.attempts > 0 && <div className="text-muted-foreground">attempts: {item.attempts}</div>}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-3 py-2 align-top">
                      {item.status === "pending" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy === item.id}
                          onClick={() => handleCancel(item.id)}
                        >
                          <Trash2 className="size-3" />
                          {busy === item.id ? "..." : "Cancel"}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageHeader>
  );
}
