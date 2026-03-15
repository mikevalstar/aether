import {
	Bot,
	CheckCircle,
	Clock,
	Copy,
	FileText,
	History,
	PenLine,
	RotateCcw,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import type { ActivityDetail } from "#/lib/activity.functions";
import { ContentView } from "./ContentView";
import { DiffView } from "./DiffView";

export function ActivityDetailDialog({
	detail,
	loading,
	reverting,
	onClose,
	onRevert,
}: {
	detail: ActivityDetail | null;
	loading: boolean;
	reverting: boolean;
	onClose: () => void;
	onRevert: (activityLogId: string) => void;
}) {
	return (
		<Dialog open={!!detail || loading} onOpenChange={onClose}>
			<DialogContent
				className="flex h-[80vh] max-w-4xl flex-col overflow-hidden sm:max-w-4xl"
				aria-describedby={undefined}
			>
				{loading ? (
					<DetailSkeleton />
				) : detail ? (
					<>
						<DialogHeader className="shrink-0">
							<div className="flex items-center justify-between gap-4 pr-8">
								<DialogTitle className="flex items-center gap-2.5 text-base">
									<span className="inline-flex size-7 items-center justify-center rounded-lg bg-[var(--teal)]/10">
										<History className="size-4 text-[var(--teal)]" />
									</span>
									{detail.summary}
								</DialogTitle>
								{detail.fileChangeDetail && (
									<RevertButton
										reverting={reverting}
										onRevert={() => onRevert(detail.id)}
									/>
								)}
							</div>
							<DetailMeta detail={detail} />
						</DialogHeader>

						{detail.fileChangeDetail && (
							<Tabs
								defaultValue="diff"
								className="mt-3 flex min-h-0 flex-1 flex-col"
							>
								<div className="shrink-0">
									{!detail.fileExists && (
										<div className="mb-3 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
											<Trash2 className="size-3.5 shrink-0" />
											File no longer exists on disk
										</div>
									)}
									<TabsList>
										<TabsTrigger value="diff">Diff</TabsTrigger>
										<TabsTrigger value="original">Original</TabsTrigger>
										<TabsTrigger value="new">New</TabsTrigger>
										{detail.fileExists && (
											<TabsTrigger value="current">Current</TabsTrigger>
										)}
									</TabsList>
								</div>

								<TabsContent
									value="diff"
									className="mt-3 min-h-0 flex-1 overflow-y-auto"
								>
									<DiffView
										original={detail.fileChangeDetail.originalContent ?? ""}
										modified={detail.fileChangeDetail.newContent}
										filePath={detail.fileChangeDetail.filePath}
									/>
								</TabsContent>

								<TabsContent
									value="original"
									className="mt-3 min-h-0 flex-1 overflow-y-auto"
								>
									<ContentView
										content={
											detail.fileChangeDetail.originalContent ??
											"(new file — no original content)"
										}
									/>
								</TabsContent>

								<TabsContent
									value="new"
									className="mt-3 min-h-0 flex-1 overflow-y-auto"
								>
									<ContentView content={detail.fileChangeDetail.newContent} />
								</TabsContent>

								{detail.fileExists && (
									<TabsContent
										value="current"
										className="mt-3 min-h-0 flex-1 overflow-y-auto"
									>
										<ContentView content={detail.currentFileContent ?? ""} />
									</TabsContent>
								)}
							</Tabs>
						)}
					</>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

function RevertButton({
	reverting,
	onRevert,
}: {
	reverting: boolean;
	onRevert: () => void;
}) {
	return (
		<Button
			variant="outline"
			size="sm"
			disabled={reverting}
			onClick={onRevert}
			className="border-amber-500/40 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-500/10 dark:hover:text-amber-300"
		>
			<RotateCcw
				className={`mr-1.5 size-3.5 ${reverting ? "animate-spin" : ""}`}
			/>
			{reverting ? "Reverting..." : "Revert"}
		</Button>
	);
}

function CopyablePath({ path }: { path: string }) {
	const [copied, setCopied] = useState(false);

	function handleCopy() {
		navigator.clipboard.writeText(path);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}

	return (
		<button
			type="button"
			onClick={handleCopy}
			className="group flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs transition-colors hover:bg-muted"
			title="Copy file path"
		>
			<FileText className="size-3 shrink-0 text-muted-foreground/60" />
			<span className="truncate max-w-[240px]">{path}</span>
			{copied ? (
				<CheckCircle className="size-3 shrink-0 text-green-600 dark:text-green-400" />
			) : (
				<Copy className="size-3 shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
			)}
		</button>
	);
}

function DetailMeta({ detail }: { detail: ActivityDetail }) {
	return (
		<div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
			<span className="flex items-center gap-1">
				<Clock className="size-3" />
				{new Date(detail.createdAt).toLocaleString()}
			</span>

			{detail.fileChangeDetail && (
				<>
					<span className="text-border">·</span>
					<CopyablePath path={detail.fileChangeDetail.filePath} />

					<span className="text-border">·</span>
					<SourceBadge source={detail.fileChangeDetail.changeSource} />
					{detail.fileChangeDetail.toolName && (
						<Badge variant="outline" className="py-0 text-[10px] font-mono">
							{detail.fileChangeDetail.toolName}
						</Badge>
					)}

					<span className="text-border">·</span>
					<FileStatus detail={detail} />
				</>
			)}
		</div>
	);
}

function SourceBadge({ source }: { source: string }) {
	if (source === "ai") {
		return (
			<Badge className="gap-1 bg-[var(--teal)]/10 py-0 text-[10px] text-[var(--teal)] hover:bg-[var(--teal)]/15 border-[var(--teal)]/20">
				<Bot className="size-2.5" />
				AI
			</Badge>
		);
	}
	return (
		<Badge className="gap-1 bg-[var(--coral)]/10 py-0 text-[10px] text-[var(--coral)] hover:bg-[var(--coral)]/15 border-[var(--coral)]/20">
			<PenLine className="size-2.5" />
			Manual
		</Badge>
	);
}

function FileStatus({ detail }: { detail: ActivityDetail }) {
	if (!detail.fileExists) {
		return (
			<span className="flex items-center gap-1 text-red-500">
				<Trash2 className="size-3" />
				Deleted
			</span>
		);
	}
	if (detail.currentFileContent === detail.fileChangeDetail?.newContent) {
		return (
			<span className="flex items-center gap-1 text-green-600 dark:text-green-400">
				<span className="relative flex size-2">
					<span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500/40" />
					<span className="relative inline-flex size-2 rounded-full bg-green-500" />
				</span>
				Current
			</span>
		);
	}
	return (
		<span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
			<PenLine className="size-3" />
			Modified since
		</span>
	);
}

function DetailSkeleton() {
	return (
		<div className="space-y-4 animate-pulse">
			<div className="flex items-center gap-3">
				<div className="size-7 rounded-lg bg-muted" />
				<div className="h-5 w-48 rounded bg-muted" />
			</div>
			<div className="flex gap-2">
				<div className="h-4 w-32 rounded bg-muted" />
				<div className="h-4 w-40 rounded bg-muted" />
				<div className="h-4 w-16 rounded bg-muted" />
			</div>
			<div className="flex gap-1">
				{[1, 2, 3, 4].map((i) => (
					<div key={i} className="h-8 w-16 rounded bg-muted" />
				))}
			</div>
			<div className="space-y-1">
				{[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
					<div
						key={i}
						className="h-5 rounded bg-muted"
						style={{ width: `${60 + Math.random() * 35}%` }}
					/>
				))}
			</div>
		</div>
	);
}
