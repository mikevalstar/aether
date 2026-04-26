import { Link, useNavigate } from "@tanstack/react-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Loader2Icon, MessageSquarePlusIcon, SearchIcon, Trash2Icon, XIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useChatThreadSearch } from "#/components/chat/ChatThreadSearch";
import { Button } from "#/components/ui/button";
import type { ChatThreadSummary } from "#/lib/chat/chat";
import { threadIdToSlug } from "#/lib/chat/chat";

dayjs.extend(relativeTime);

export interface ChatMenuOverlayProps {
  open: boolean;
  threads: ChatThreadSummary[];
  selectedThreadId: string | null;
  busy?: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onDeleteThread: (thread: ChatThreadSummary) => void;
}

export function ChatMenuOverlay({
  open,
  threads,
  selectedThreadId,
  busy,
  onClose,
  onNewChat,
  onDeleteThread,
}: ChatMenuOverlayProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, setQuery, filtered, isSearching } = useChatThreadSearch(threads);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSelect = (threadId: string) => {
    onClose();
    void navigate({ to: "/chat/$threadId", params: { threadId: threadIdToSlug(threadId) } });
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
      <div className="absolute inset-0 bg-[var(--ink)]/55 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className="absolute top-3 right-2 left-2 flex max-h-[92vh] flex-col overflow-hidden rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] shadow-2xl shadow-black/30 lg:-translate-x-1/2 lg:top-[10%] lg:right-auto lg:left-1/2 lg:max-h-[78vh] lg:w-[min(820px,92vw)]"
        role="dialog"
        aria-modal="true"
        aria-label="Chat menu"
      >
        <div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-4">
          <div className="flex size-7 items-center justify-center rounded bg-[var(--accent)] font-mono text-sm font-bold text-[var(--accent-foreground)]">
            æ
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">Aether · Chat menu</div>
          <span className="ml-auto rounded border border-[var(--line)] bg-[var(--bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-faint)]">
            esc
          </span>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close menu">
            <XIcon className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-3">
          {isSearching ? (
            <Loader2Icon className="size-4 animate-spin text-[var(--accent)]" />
          ) : (
            <SearchIcon className="size-4 text-[var(--ink-faint)]" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search threads…"
            className="flex-1 bg-transparent font-mono text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
            type="text"
          />
        </div>

        <div className="flex items-center gap-2 px-5 py-3">
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => {
              onClose();
              onNewChat();
            }}
            className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)]"
          >
            <MessageSquarePlusIcon className="size-4" />
            New chat
          </Button>
          <Link
            to="/chat-debug"
            onClick={onClose}
            className="ml-auto hidden font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)] hover:text-[var(--accent)] lg:inline"
          >
            chat-debug ↗
          </Link>
        </div>

        <div className="flex items-center justify-between border-t border-b border-[var(--line)] bg-[var(--bg)] px-5 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
          <span>Threads · {filtered.length}</span>
          {threads.length > 0 && filtered.length !== threads.length && <span>{threads.length} total</span>}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center font-mono text-xs text-[var(--ink-faint)] uppercase tracking-[0.14em]">
              {threads.length === 0 ? "No threads yet" : "No matching threads"}
            </div>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {filtered.map((thread) => (
                <li key={thread.id}>
                  <ThreadRow
                    thread={thread}
                    isActive={thread.id === selectedThreadId}
                    busy={busy}
                    onSelect={() => handleSelect(thread.id)}
                    onDelete={() => onDeleteThread(thread)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ThreadRow({
  thread,
  isActive,
  busy,
  onSelect,
  onDelete,
}: {
  thread: ChatThreadSummary;
  isActive: boolean;
  busy?: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group relative flex items-center gap-4 px-5 py-3 transition-colors ${
        isActive ? "bg-[var(--accent-subtle)]" : "hover:bg-[var(--bg)]"
      }`}
    >
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-4 text-left">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]" title={thread.id}>
          {thread.id
            .slice(thread.id.startsWith("thread_") ? 7 : 0, thread.id.length)
            .slice(0, 6)
            .toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className={`truncate text-sm font-medium ${isActive ? "text-[var(--accent)]" : "text-[var(--ink)]"}`}>
            {thread.title}
          </div>
          {thread.preview && <div className="truncate text-xs text-[var(--ink-soft)]">{thread.preview}</div>}
        </div>
        <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)] lg:inline">
          {dayjs(thread.updatedAt).fromNow()}
        </span>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={busy}
        onClick={onDelete}
        className="opacity-0 transition group-hover:opacity-100 hover:text-destructive"
        aria-label={`Delete ${thread.title}`}
      >
        <Trash2Icon className="size-3.5" />
      </Button>
    </div>
  );
}
