import { Trash2Icon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

export interface ChatThreadItemProps {
	title: string;
	preview: string;
	isActive?: boolean;
	disabled?: boolean;
	onClick?: () => void;
	onDelete?: () => void;
}

export function ChatThreadItem({
	title,
	preview,
	isActive = false,
	disabled = false,
	onClick,
	onDelete,
}: ChatThreadItemProps) {
	return (
		<div className="group relative">
			<button
				type="button"
				onClick={onClick}
				className={cn(
					"w-full rounded-lg px-3 py-3 pr-11 text-left transition-all duration-150",
					isActive
						? "border-l-[3px] border-l-[var(--teal)] bg-[var(--teal-subtle)] text-[var(--ink)]"
						: "border-l-[3px] border-l-transparent text-[var(--ink-soft)] hover:bg-[var(--teal-subtle)] hover:text-[var(--ink)]",
				)}
			>
				<p className="truncate text-sm font-semibold">{title}</p>
				<p className="mt-0.5 truncate text-xs text-[var(--ink-soft)]">
					{preview}
				</p>
			</button>
			<Button
				type="button"
				variant="ghost"
				size="icon-xs"
				className={cn(
					"absolute top-3 right-2 text-[var(--ink-soft)] opacity-0 transition hover:text-destructive",
					isActive && "opacity-100",
					"group-hover:opacity-100",
				)}
				disabled={disabled}
				onClick={(event) => {
					event.stopPropagation();
					onDelete?.();
				}}
				aria-label={`Delete ${title}`}
			>
				<Trash2Icon className="size-3.5" />
			</Button>
		</div>
	);
}
