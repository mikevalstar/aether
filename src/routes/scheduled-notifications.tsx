import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import type { VariantProps } from "class-variance-authority";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { AlarmClock, AlertTriangle, Ban, CheckCircle2, Clock, Info, Smartphone, Trash2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { PageHeader } from "#/components/PageHeader";
import { Badge, type badgeVariants } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { DataTable, type DataTableColumn } from "#/components/ui/data-table";
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

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const LEVEL_VARIANTS: Record<string, BadgeVariant> = {
  info: "info",
  low: "ghost",
  medium: "warning",
  high: "warning",
  critical: "destructive",
  error: "destructive",
};

type ScheduledItem = ScheduledNotificationListResult["items"][number];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: typeof Clock; variant: BadgeVariant }> = {
    pending: { label: "Pending", icon: Clock, variant: "info" },
    sent: { label: "Sent", icon: CheckCircle2, variant: "success" },
    cancelled: { label: "Cancelled", icon: Ban, variant: "ghost" },
    failed: { label: "Failed", icon: AlertTriangle, variant: "destructive" },
  };
  const cfg = map[status] ?? { label: status, icon: Info, variant: "ghost" as BadgeVariant };
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant}>
      <Icon />
      {cfg.label}
    </Badge>
  );
}

function ScheduledNotificationsPage() {
  const router = useRouter();
  const navigate = useNavigate({ from: Route.fullPath });
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

  function setStatus(value: (typeof STATUS_FILTERS)[number]["value"]) {
    void navigate({
      search: { status: value === "pending" ? undefined : value },
      replace: true,
    });
  }

  const columns: DataTableColumn<ScheduledItem>[] = [
    {
      key: "title",
      header: "Notification",
      cell: (item) => (
        <div>
          <div className="font-medium text-[var(--ink)]">{item.title}</div>
          {item.body && <div className="mt-0.5 line-clamp-2 text-xs text-[var(--ink-soft)]">{item.body}</div>}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {item.pushToPhone && (
              <Badge variant="outline">
                <Smartphone />
                Phone
              </Badge>
            )}
            {item.attempts > 0 && <Badge variant="ghost">attempts: {item.attempts}</Badge>}
          </div>
          {item.lastError && <div className="mt-1 text-xs text-destructive">Error: {item.lastError}</div>}
        </div>
      ),
    },
    {
      key: "level",
      header: "Level",
      cell: (item) => <Badge variant={LEVEL_VARIANTS[item.level] ?? "ghost"}>{item.level}</Badge>,
    },
    {
      key: "scheduled",
      header: "Scheduled For",
      mono: true,
      cell: (item) => {
        const tz = item.timezone || dayjs.tz.guess();
        const when = dayjs.utc(item.scheduledAt).tz(tz);
        const isFuture = when.valueOf() > Date.now();
        return (
          <div className="text-[12.5px]">
            <div className="text-[var(--ink)]">{when.format("YYYY-MM-DD HH:mm")}</div>
            <div className="text-[var(--ink-faint)]">
              {tz} · {isFuture ? when.fromNow() : `${when.fromNow()} (past)`}
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (item) =>
        item.status === "pending" ? (
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={busy === item.id}
            onClick={(e) => {
              e.stopPropagation();
              void handleCancel(item.id);
            }}
            title="Cancel"
            aria-label="Cancel scheduled notification"
          >
            <Trash2 className="size-4 text-[var(--ink-soft)]" />
          </Button>
        ) : (
          <span className="text-[var(--ink-faint)]">—</span>
        ),
    },
  ];

  return (
    <PageHeader
      icon={AlarmClock}
      label="System"
      title="Scheduled"
      highlight="notifications"
      description="Reminders the AI (or system) has scheduled for later delivery. You can cancel any pending one here."
    >
      {/* Counts summary */}
      <section className="mb-3 flex flex-wrap gap-1.5">
        <Badge variant="info">
          <Clock />
          {data.counts.pending} pending
        </Badge>
        <Badge variant="success">
          <CheckCircle2 />
          {data.counts.sent} sent
        </Badge>
        <Badge variant="ghost">
          <Ban />
          {data.counts.cancelled} cancelled
        </Badge>
        <Badge variant="destructive">
          <AlertTriangle />
          {data.counts.failed} failed
        </Badge>
      </section>

      {/* Status filter chips */}
      <section className="mb-4 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((filter) => {
          const active = activeStatus === filter.value;
          return (
            <Button
              key={filter.value}
              variant={active ? "default" : "outline"}
              size="xs"
              onClick={() => setStatus(filter.value)}
              className="tracking-[0.06em]"
            >
              {filter.label}
            </Button>
          );
        })}
      </section>

      <DataTable
        title="Scheduled"
        count={data.items.length}
        data={data.items}
        columns={columns}
        rowKey={(item) => item.id}
        empty={`No ${activeStatus === "all" ? "" : activeStatus} scheduled notifications.`}
      />
    </PageHeader>
  );
}
