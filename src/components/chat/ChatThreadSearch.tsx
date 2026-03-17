import Fuse, { type IFuseOptions } from "fuse.js";
import { SearchIcon, XIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { ChatThreadSummary } from "#/lib/chat";

const fuseOptions: IFuseOptions<ChatThreadSummary> = {
	keys: [
		{ name: "title", weight: 2 },
		{ name: "preview", weight: 1 },
	],
	threshold: 0.4,
	ignoreLocation: true,
};

export function useChatThreadSearch(threads: ChatThreadSummary[]) {
	const [query, setQuery] = useState("");

	const fuse = useMemo(() => new Fuse(threads, fuseOptions), [threads]);

	const filtered = useMemo(() => {
		if (!query.trim()) return threads;
		return fuse.search(query).map((result) => result.item);
	}, [fuse, query, threads]);

	return { query, setQuery, filtered };
}

export function ChatThreadSearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
	const inputRef = useRef<HTMLInputElement>(null);

	return (
		<div className="relative">
			<SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[var(--ink-soft)]/50" />
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
