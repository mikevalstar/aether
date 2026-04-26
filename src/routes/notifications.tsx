import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import type { VariantProps } from "class-variance-authority";
import {
  AlertTriangle,
  Archive,
  Bell,
  BellRing,
  ChevronDown,
  Eye,
  EyeOff,
  Info,
  OctagonAlert,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { PageHeader } from "#/components/PageHeader";
import { PaginationControls } from "#/components/PaginationControls";
import { Badge, type badgeVariants } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import { DataTableHeader } from "#/components/ui/data-table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "#/components/ui/dropdown-menu";
import { toast } from "#/components/ui/sonner";
import { getSession } from "#/lib/auth.functions";
import {
  archiveNotifications,
  deleteNotifications,
  getNotificationList,
  markNotificationsRead,
  markNotificationsUnread,
  type NotificationListItem,
  type NotificationListResult,
} from "#/lib/notifications-page.functions";

const notificationsSearchSchema = z.object({
  page: z.coerce.number().optional(),
  level: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
});

export const Route = createFileRoute("/notifications")({
  validateSearch: notificationsSearchSchema,
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  loaderDeps: ({ search }) => ({
    page: search.page,
    level: search.level,
    category: search.category,
    status: search.status as "all" | "unread" | "read" | "archived" | undefined,
  }),
  loader: async ({ deps }) => {
    return await getNotificationList({ data: deps });
  },
  component: NotificationsPage,
});

const LEVEL_FILTERS = [
  { value: "all", label: "All Levels" },
  { value: "info", label: "Info" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
  { value: "error", label: "Error" },
];

const CATEGORY_FILTERS = [
  { value: "all", label: "All Sources" },
  { value: "task", label: "Tasks" },
  { value: "workflow", label: "Workflows" },
  { value: "ai", label: "AI" },
  { value: "system", label: "System" },
];

const STATUS_FILTERS = [
  { value: "all", label: "Active" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "archived", label: "Archived" },
];

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

type LevelConfig = {
  icon: typeof Info;
  label: string;
  variant: BadgeVariant;
};

const LEVEL_CONFIG: Record<string, LevelConfig> = {
  info: { icon: Info, label: "Info", variant: "info" },
  low: { icon: BellRing, label: "Low", variant: "ghost" },
  medium: { icon: Bell, label: "Medium", variant: "warning" },
  high: { icon: AlertTriangle, label: "High", variant: "warning" },
  critical: { icon: OctagonAlert, label: "Critical", variant: "destructive" },
  error: { icon: ShieldAlert, label: "Error", variant: "destructive" },
};

function LevelBadge({ level }: { level: string }) {
  const config = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.info;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant}>
      <Icon />
      {config.label}
    </Badge>
  );
}

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return null;
  return <Badge variant="outline">{category}</Badge>;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function NotificationsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const router = useRouter();
  const data = Route.useLoaderData() as NotificationListResult;

  async function handleRowClick(n: NotificationListItem) {
    if (n.read) return;
    try {
      await markNotificationsRead({ data: { ids: [n.id] } });
      void router.invalidate();
    } catch {
      // ignore
    }
  }
  const search = Route.useSearch();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const activeLevel = search.level ?? "all";
  const activeCategory = search.category ?? "all";
  const activeStatus = search.status ?? "all";

  const allSelected = data.items.length > 0 && selected.size === data.items.length;
  const someSelected = selected.size > 0;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.items.map((n) => n.id)));
    }
  }

  async function bulkAction(action: "read" | "unread" | "archive" | "delete") {
    const ids = [...selected];
    if (ids.length === 0) return;
    setLoading(true);
    try {
      switch (action) {
        case "read":
          await markNotificationsRead({ data: { ids } });
          toast.success(`Marked ${ids.length} as read`);
          break;
        case "unread":
          await markNotificationsUnread({ data: { ids } });
          toast.success(`Marked ${ids.length} as unread`);
          break;
        case "archive":
          await archiveNotifications({ data: { ids } });
          toast.success(`Archived ${ids.length} notifications`);
          break;
        case "delete":
          await deleteNotifications({ data: { ids } });
          toast.success(`Deleted ${ids.length} notifications`);
          break;
      }
      setSelected(new Set());
      void navigate({ search: { ...search }, replace: true });
    } catch (err) {
      console.error("Notification bulk action failed:", err);
      toast.error("Action failed");
    } finally {
      setLoading(false);
    }
  }

  function setFilter(key: "level" | "category" | "status", value: string) {
    void navigate({
      search: {
        ...search,
        page: 1,
        [key]: value === "all" ? undefined : value,
      },
      replace: true,
    });
    setSelected(new Set());
  }

  return (
    <PageHeader
      icon={Bell}
      label="Notifications"
      title="Notification"
      highlight="inbox"
      description="View and manage all your notifications."
    >
      {/* Status filter chips */}
      <section className="mb-3 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((filter) => {
          const active = activeStatus === filter.value;
          return (
            <Button
              key={filter.value}
              variant={active ? "default" : "outline"}
              size="xs"
              onClick={() => setFilter("status", filter.value)}
              className="tracking-[0.06em]"
            >
              {filter.label}
            </Button>
          );
        })}
      </section>

      {/* Secondary filters + bulk actions */}
      <section className="mb-4 flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="xs" className="gap-1">
              {LEVEL_FILTERS.find((f) => f.value === activeLevel)?.label ?? "All Levels"}
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {LEVEL_FILTERS.map((filter) => (
              <DropdownMenuItem key={filter.value} onClick={() => setFilter("level", filter.value)}>
                {filter.value !== "all" ? <LevelBadge level={filter.value} /> : filter.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="xs" className="gap-1">
              {CATEGORY_FILTERS.find((f) => f.value === activeCategory)?.label ?? "All Sources"}
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {CATEGORY_FILTERS.map((filter) => (
              <DropdownMenuItem key={filter.value} onClick={() => setFilter("category", filter.value)}>
                {filter.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {someSelected && (
          <div className="ml-auto flex items-center gap-1">
            <span className="mr-1 font-mono text-[10.5px] uppercase tracking-[0.15em] text-[var(--ink-soft)]">
              {selected.size} selected
            </span>
            <Button variant="ghost" size="xs" disabled={loading} onClick={() => void bulkAction("read")}>
              <Eye />
              Read
            </Button>
            <Button variant="ghost" size="xs" disabled={loading} onClick={() => void bulkAction("unread")}>
              <EyeOff />
              Unread
            </Button>
            <Button variant="ghost" size="xs" disabled={loading} onClick={() => void bulkAction("archive")}>
              <Archive />
              Archive
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="text-destructive hover:text-destructive"
              disabled={loading}
              onClick={() => void bulkAction("delete")}
            >
              <Trash2 />
              Delete
            </Button>
          </div>
        )}
      </section>

      {/* Notification list */}
      <DataTableHeader title="Inbox" count={data.total} />
      <div className="surface-card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[var(--line)] bg-[var(--bg)]/40 px-3 py-2">
          <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.15em] text-[var(--ink-soft)]">
            {data.total} notification{data.total !== 1 ? "s" : ""}
          </span>
        </div>

        {data.items.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-[var(--ink-soft)]">No notifications found.</div>
        ) : (
          data.items.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              selected={selected.has(n.id)}
              onToggle={() => toggleSelect(n.id)}
              onClick={() => void handleRowClick(n)}
            />
          ))
        )}
      </div>

      <PaginationControls
        page={data.page}
        totalPages={data.totalPages}
        onPageChange={(p) => void navigate({ search: { ...search, page: p }, replace: true })}
      />
    </PageHeader>
  );
}

function NotificationRow({
  notification: n,
  selected,
  onToggle,
  onClick,
}: {
  notification: NotificationListItem;
  selected: boolean;
  onToggle: () => void;
  onClick: () => void;
}) {
  const rowBody = (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <LevelBadge level={n.level} />
        <CategoryBadge category={n.category} />
        {!n.read && <span aria-hidden className="size-1.5 rounded-full bg-[var(--accent)]" />}
      </div>
      <div className="flex items-start justify-between gap-2">
        <span className={`text-sm text-[var(--ink)] ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</span>
        <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-[var(--ink-faint)]">{timeAgo(n.createdAt)}</span>
      </div>
      {n.body && <p className="line-clamp-2 text-xs text-[var(--ink-soft)]">{n.body}</p>}
      {n.source && (
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">source: {n.source}</span>
      )}
    </div>
  );

  return (
    <div
      className={`flex items-start gap-3 border-b border-[var(--line)] px-3 py-2.5 transition-colors last:border-b-0 ${
        !n.read ? "bg-[var(--accent-subtle)]/40" : ""
      } ${selected ? "bg-[var(--accent-subtle)]/70" : ""} hover:bg-[var(--bg)]/60`}
    >
      <div className="pt-0.5">
        <Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`Select ${n.title}`} />
      </div>

      {n.link ? (
        <Link to={n.link} className="flex min-w-0 flex-1 text-inherit no-underline" onClick={onClick}>
          {rowBody}
        </Link>
      ) : (
        <button type="button" className="flex min-w-0 flex-1 text-left" onClick={onClick}>
          {rowBody}
        </button>
      )}
    </div>
  );
}
