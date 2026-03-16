import { ChevronDownIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "#/lib/utils";

export type ToolActivityStatusType = "complete" | "incomplete" | "requires-action" | "running";

type ToolActivitySummaryProps = {
	total: number;
	runningCount: number;
	errorCount: number;
	status: ToolActivityStatusType;
	expanded?: boolean;
	className?: string;
};

const RUNNING_MESSAGES = [
	"reticulating splines",
	"warming the vacuum tubes",
	"seeking sector 7G",
	"syncing cassette buffers",
	"aligning warp vectors",
	"dialing the BBS",
];

export function ToolActivitySummary({
	total,
	runningCount,
	errorCount,
	status,
	expanded = false,
	className,
}: ToolActivitySummaryProps) {
	const [messageIndex, setMessageIndex] = useState(0);
	const isRunning = status === "running";

	useEffect(() => {
		if (!isRunning) {
			setMessageIndex(0);
			return;
		}

		const intervalId = window.setInterval(() => {
			setMessageIndex((current) => (current + 1) % RUNNING_MESSAGES.length);
		}, 1700);

		return () => window.clearInterval(intervalId);
	}, [isRunning]);

	const line = buildSummaryLine({
		total,
		runningCount,
		errorCount,
		status,
		runningMessage: RUNNING_MESSAGES[messageIndex] ?? RUNNING_MESSAGES[0],
	});

	return (
		<div
			className={cn(
				"group/tool-activity relative flex w-full items-center gap-2 overflow-hidden px-1 py-1 text-left text-[11px] text-muted-foreground/80 transition-colors hover:text-muted-foreground",
				className,
			)}
		>
			{isRunning ? (
				<>
					<span
						aria-hidden
						className="pointer-events-none absolute inset-y-0 left-0 w-28 bg-linear-to-r from-amber-500/8 via-amber-500/18 to-transparent opacity-80 motion-reduce:hidden"
					/>
					<span className="relative flex shrink-0 items-end gap-0.5 text-amber-600 dark:text-amber-400" aria-hidden>
						<span className="h-2 w-0.5 animate-pulse rounded-full bg-current" />
						<span className="h-3 w-0.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
						<span className="h-2.5 w-0.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
					</span>
				</>
			) : (
				<span
					aria-hidden
					className={cn(
						"inline-flex size-1.5 shrink-0 rounded-full",
						status === "complete" && "bg-muted-foreground/60",
						status === "requires-action" && "bg-amber-500",
						status === "incomplete" && "bg-destructive",
					)}
				/>
			)}

			<span className="relative truncate">{line}</span>
			<ChevronDownIcon
				className={cn(
					"ml-auto size-3.5 shrink-0 transition-transform",
					"group-data-[state=open]/tool-activity-trigger:rotate-180",
					expanded && "rotate-180",
				)}
				aria-hidden
			/>
		</div>
	);
}

function buildSummaryLine({
	total,
	runningCount,
	errorCount,
	status,
	runningMessage,
}: {
	total: number;
	runningCount: number;
	errorCount: number;
	status: ToolActivityStatusType;
	runningMessage: string;
}) {
	const toolLabel = `${total} ${total === 1 ? "tool call" : "tool calls"}`;

	if (status === "running") {
		const runningLabel = runningCount > 1 ? `${runningCount} running` : "running";
		return `${toolLabel} • ${runningLabel} • ${runningMessage}...`;
	}

	if (status === "incomplete") {
		return `${toolLabel} • ${errorCount} issue${errorCount === 1 ? "" : "s"}`;
	}

	if (status === "requires-action") {
		return `${toolLabel} • awaiting input`;
	}

	return `${toolLabel} • ready to inspect`;
}
