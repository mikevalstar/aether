import { useCallback, useEffect, useRef, useState } from "react";
import { getUnreadNotifications } from "#/lib/notifications.functions";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  createdAt: Date;
};

const POLL_INTERVAL = 10_000;

export function useNotifications(enabled: boolean) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const onNewRef = useRef<((n: Notification) => void) | null>(null);

  const poll = useCallback(async () => {
    if (!enabled) return;
    try {
      const result = await getUnreadNotifications();
      setNotifications(result.notifications);
      setUnreadCount(result.count);

      // Detect new notifications
      for (const n of result.notifications) {
        if (!knownIdsRef.current.has(n.id)) {
          knownIdsRef.current.add(n.id);
          onNewRef.current?.(n);
        }
      }
    } catch {
      // silently ignore polling errors
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    void poll();

    const interval = setInterval(() => void poll(), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [enabled, poll]);

  const setOnNew = useCallback((cb: (n: Notification) => void) => {
    onNewRef.current = cb;
  }, []);

  return { unreadCount, notifications, poll, setOnNew };
}
