import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Plus } from "lucide-react";
import { threadIdToSlug } from "#/lib/chat/chat";
import type { DashboardThread } from "#/lib/dashboard.functions";

type Props = {
  threads: DashboardThread[];
};

export function RecentChats({ threads }: Props) {
  if (threads.length === 0) {
    return (
      <div className="space-y-3 pb-2">
        <Header />
        <Link
          to="/chat"
          className="flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground no-underline transition-colors hover:border-[var(--teal)]/40 hover:text-foreground"
        >
          <Plus className="size-4" />
          Start your first conversation
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-2">
      <Header />
      {threads.map((thread) => (
        <Link
          key={thread.id}
          to="/chat/$threadId"
          params={{ threadId: threadIdToSlug(thread.id) }}
          className="group flex items-start gap-3 rounded-lg border border-transparent px-3 py-2 no-underline transition-colors hover:border-border hover:bg-card"
        >
          <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-[var(--teal)] opacity-60 group-hover:opacity-100" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-sm font-medium text-foreground">{thread.title}</p>
              <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                {formatDistanceToNow(new Date(thread.updatedAt), { addSuffix: true })}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{thread.preview}</p>
          </div>
        </Link>
      ))}
      <Link
        to="/chat"
        className="mt-1 flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[var(--teal)] no-underline opacity-80 transition-opacity hover:opacity-100"
      >
        <Plus className="size-3" />
        New chat
      </Link>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center justify-between px-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recent Chats</h3>
      <Link to="/chat" className="text-xs text-[var(--teal)] no-underline hover:underline">
        View all
      </Link>
    </div>
  );
}
