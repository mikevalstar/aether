import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { toast } from "#/components/ui/sonner";
import { useNotifications } from "#/hooks/useNotifications";
import { getRecentNotifications, markAllNotificationsRead, markNotificationRead } from "#/lib/notifications.functions";

/** Levels shown in the header bell dropdown — medium and above */
const BELL_VISIBLE_LEVELS = new Set(["medium", "high", "critical", "error"]);

type RecentNotification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  level: string;
  category: string | null;
  read: boolean;
  createdAt: Date;
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const LEVEL_DOT_COLORS: Record<string, string> = {
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
  error: "bg-red-700",
};

export default function NotificationBell() {
  const { notifications, setOnNew, poll } = useNotifications(true);
  const unreadCount = notifications.filter((n) => BELL_VISIBLE_LEVELS.has(n.level)).length;
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<RecentNotification[]>([]);
  const [loading, setLoading] = useState(false);

  // Show toasts for new notifications
  useEffect(() => {
    setOnNew((n) => {
      toast.info(n.title, { description: n.body ?? undefined });
    });
  }, [setOnNew]);

  // Load recent notifications when popover opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getRecentNotifications()
      .then((result) => {
        // Filter to medium+ levels for the bell dropdown
        const filtered = result.notifications.filter((n) => BELL_VISIBLE_LEVELS.has(n.level));
        setRecent(filtered);
      })
      .catch((err) => console.error("Failed to load notifications:", err))
      .finally(() => setLoading(false));
  }, [open]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setRecent((prev) => prev.map((n) => ({ ...n, read: true })));
      void poll();
    } catch {
      toast.error("Failed to mark notifications as read");
    }
  };

  const handleClick = async (notification: RecentNotification) => {
    if (!notification.read) {
      try {
        await markNotificationRead({ data: { id: notification.id } });
        setRecent((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
        void poll();
      } catch {
        // ignore
      }
    }
    if (notification.link) {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className={`relative rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            unreadCount > 0
              ? "text-[var(--accent)] hover:bg-[var(--accent-subtle)]"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground ring-2 ring-[var(--header-bg)]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={handleMarkAllRead}>
              <CheckCheck className="mr-1 size-3" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading && recent.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">Loading...</div>
          ) : recent.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">No notifications</div>
          ) : (
            recent.map((n) => {
              const dotColor = LEVEL_DOT_COLORS[n.level] ?? "";
              const content = (
                <button
                  type="button"
                  className={`flex w-full flex-col gap-0.5 px-3 py-2.5 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-colors text-left ${
                    !n.read ? "bg-[var(--accent-subtle)]" : ""
                  }`}
                  onClick={() => void handleClick(n)}
                >
                  <div className="flex items-start justify-between gap-2 w-full">
                    <div className="flex items-center gap-1.5">
                      {dotColor && <span className={`size-1.5 rounded-full ${dotColor}`} />}
                      <span className={`text-sm ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</span>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                  </div>
                  {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                </button>
              );

              if (n.link) {
                return (
                  <Link key={n.id} to={n.link} className="no-underline text-inherit" onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                );
              }
              return <div key={n.id}>{content}</div>;
            })
          )}
        </div>
        <div className="border-t border-border">
          <Link
            to="/notifications"
            className="block px-3 py-2 text-center text-xs text-muted-foreground hover:text-foreground transition-colors no-underline"
            onClick={() => setOpen(false)}
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
