import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { toast } from "#/components/ui/sonner";
import { useNotifications } from "#/hooks/useNotifications";
import { getRecentNotifications, markAllNotificationsRead, markNotificationRead } from "#/lib/notifications.functions";

type RecentNotification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
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

export default function NotificationBell() {
  const { unreadCount, setOnNew, poll } = useNotifications(true);
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
      .then((result) => setRecent(result.notifications))
      .catch(() => {})
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
          className="relative rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-[var(--coral)] text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
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
              const content = (
                <button
                  type="button"
                  className={`flex w-full flex-col gap-0.5 px-3 py-2.5 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-colors text-left ${
                    !n.read ? "bg-[var(--teal-subtle)]" : ""
                  }`}
                  onClick={() => void handleClick(n)}
                >
                  <div className="flex items-start justify-between gap-2 w-full">
                    <span className={`text-sm ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</span>
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
      </PopoverContent>
    </Popover>
  );
}
