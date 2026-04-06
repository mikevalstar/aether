import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
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
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
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

type LevelConfig = {
  icon: typeof Info;
  color: string;
  bg: string;
  label: string;
};

const LEVEL_CONFIG: Record<string, LevelConfig> = {
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10", label: "Info" },
  low: { icon: BellRing, color: "text-slate-500", bg: "bg-slate-500/10", label: "Low" },
  medium: { icon: Bell, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Medium" },
  high: { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10", label: "High" },
  critical: { icon: OctagonAlert, color: "text-red-500", bg: "bg-red-500/10", label: "Critical" },
  error: { icon: ShieldAlert, color: "text-red-700 dark:text-red-400", bg: "bg-red-700/10", label: "Error" },
};

function LevelBadge({ level }: { level: string }) {
  const config = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.info;
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${config.bg} ${config.color}`}
    >
      <Icon className="size-3" />
      {config.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return null;
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
      {category}
    </Badge>
  );
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
      // Re-navigate to trigger loader refresh
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
      highlight="center"
      description="View and manage all your notifications."
    >
      {/* Filters + bulk actions row */}
      <section className="mb-4 flex flex-wrap items-center gap-2">
        {/* Status filter — segmented/split button */}
        <div className="inline-flex rounded-md border border-border overflow-hidden">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={`px-3 py-1 text-sm font-medium transition-colors border-r border-border last:border-r-0 ${
                activeStatus === filter.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              onClick={() => setFilter("status", filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Level filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              {LEVEL_FILTERS.find((f) => f.value === activeLevel)?.label ?? "All Levels"}
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {LEVEL_FILTERS.map((filter) => (
              <DropdownMenuItem key={filter.value} onClick={() => setFilter("level", filter.value)}>
                {filter.value !== "all" && <LevelBadge level={filter.value} />}
                {filter.value === "all" && filter.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Category filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
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

        {/* Bulk actions — right-aligned */}
        {someSelected && (
          <div className="ml-auto flex items-center gap-1">
            <span className="mr-1 text-xs text-muted-foreground">{selected.size} selected</span>
            <Button variant="ghost" size="sm" disabled={loading} onClick={() => void bulkAction("read")}>
              <Eye className="mr-1 size-3" />
              Read
            </Button>
            <Button variant="ghost" size="sm" disabled={loading} onClick={() => void bulkAction("unread")}>
              <EyeOff className="mr-1 size-3" />
              Unread
            </Button>
            <Button variant="ghost" size="sm" disabled={loading} onClick={() => void bulkAction("archive")}>
              <Archive className="mr-1 size-3" />
              Archive
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={loading}
              onClick={() => void bulkAction("delete")}
            >
              <Trash2 className="mr-1 size-3" />
              Delete
            </Button>
          </div>
        )}
      </section>

      {/* Notification list */}
      <div className="rounded-lg border border-border bg-card">
        {/* Header row */}
        <div className="flex items-center gap-3 border-b border-border px-3 py-2">
          <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
          <span className="text-xs text-muted-foreground">
            {data.total} notification{data.total !== 1 ? "s" : ""}
          </span>
        </div>

        {data.items.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">No notifications found.</div>
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
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <LevelBadge level={n.level} />
        <CategoryBadge category={n.category} />
        {!n.read && <span className="size-1.5 rounded-full bg-[var(--teal)]" />}
      </div>
      <div className="flex items-start justify-between gap-2">
        <span className={`text-sm ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</span>
        <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
      </div>
      {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
      {n.source && <span className="text-[10px] text-muted-foreground">Source: {n.source}</span>}
    </div>
  );

  return (
    <div
      className={`flex items-start gap-3 border-b border-border px-3 py-2.5 transition-colors ${
        !n.read ? "bg-[var(--teal-subtle)]" : ""
      } ${selected ? "bg-muted/60" : ""} hover:bg-muted/40`}
    >
      <div className="pt-0.5">
        <Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`Select ${n.title}`} />
      </div>

      {n.link ? (
        <Link to={n.link} className="no-underline text-inherit flex min-w-0 flex-1" onClick={onClick}>
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
