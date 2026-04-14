import Fuse, { type IFuseOptions } from "fuse.js";
import { Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatThreadSummary } from "#/lib/chat/chat";
import { searchChatThreads } from "#/lib/chat/chat.functions";

const fuseOptions: IFuseOptions<ChatThreadSummary> = {
  keys: [
    { name: "title", weight: 2 },
    { name: "preview", weight: 1 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
};

const SEMANTIC_DEBOUNCE_MS = 400;
const SEMANTIC_MIN_LENGTH = 3;

export function useChatThreadSearch(threads: ChatThreadSummary[]) {
  const [query, setQuery] = useState("");
  const [semanticIds, setSemanticIds] = useState<string[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fuse = useMemo(() => new Fuse(threads, fuseOptions), [threads]);
  const threadMap = useMemo(() => new Map(threads.map((t) => [t.id, t])), [threads]);

  const runSemanticSearch = useCallback(async (q: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);
    try {
      const results = await searchChatThreads({ data: { query: q, limit: 20 } });
      if (controller.signal.aborted) return;
      setSemanticIds(results.map((r) => r.id));
    } catch {
      if (controller.signal.aborted) return;
      // On error, fall back to fuse-only results
      setSemanticIds(null);
    } finally {
      if (!controller.signal.aborted) {
        setIsSearching(false);
      }
    }
  }, []);

  // Debounce semantic search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const trimmed = query.trim();
    if (trimmed.length < SEMANTIC_MIN_LENGTH) {
      setSemanticIds(null);
      setIsSearching(false);
      abortRef.current?.abort();
      return;
    }

    setIsSearching(true);
    timerRef.current = setTimeout(() => {
      void runSemanticSearch(trimmed);
    }, SEMANTIC_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, runSemanticSearch]);

  const filtered = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return threads;

    const fuseResults = fuse.search(trimmed).map((r) => r.item);

    if (!semanticIds) return fuseResults;

    // Merge: semantic results first (ordered by relevance), then any fuse-only matches
    const merged: ChatThreadSummary[] = [];
    const seen = new Set<string>();

    for (const id of semanticIds) {
      const thread = threadMap.get(id);
      if (thread && !seen.has(id)) {
        merged.push(thread);
        seen.add(id);
      }
    }

    for (const thread of fuseResults) {
      if (!seen.has(thread.id)) {
        merged.push(thread);
        seen.add(thread.id);
      }
    }

    return merged;
  }, [fuse, query, threads, semanticIds, threadMap]);

  return { query, setQuery, filtered, isSearching };
}

export function ChatThreadSearchInput({
  value,
  onChange,
  isSearching,
}: {
  value: string;
  onChange: (value: string) => void;
  isSearching?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      {isSearching ? (
        <Loader2Icon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 animate-spin text-[var(--teal)]" />
      ) : (
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[var(--ink-soft)]/50" />
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search threads..."
        className="w-full rounded-md border border-[var(--line)] bg-transparent py-1.5 pr-7 pl-8 text-xs text-[var(--ink)] placeholder:text-[var(--ink-soft)]/40 focus:border-[var(--teal)] focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-2 -translate-y-1/2 text-[var(--ink-soft)]/50 hover:text-[var(--ink)]"
        >
          <XIcon className="size-3" />
        </button>
      )}
    </div>
  );
}
