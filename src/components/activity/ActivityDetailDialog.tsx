import { CheckCircle, Clock, History, PenLine, RotateCcw } from "lucide-react";
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
					<DialogHeader>
						<DialogTitle className="text-muted-foreground">
							Loading...
						</DialogTitle>
					</DialogHeader>
				) : detail ? (
					<>
						<DialogHeader className="shrink-0">
							<div className="flex items-center justify-between gap-4 pr-8">
								<DialogTitle className="flex items-center gap-2">
									<History className="size-5 text-[var(--teal)]" />
									{detail.summary}
								</DialogTitle>
								{detail.fileChangeDetail && (
									<Button
										variant="destructive"
										size="sm"
										disabled={reverting}
										onClick={() => onRevert(detail.id)}
									>
										<RotateCcw className="mr-1.5 size-3.5" />
										{reverting ? "Reverting..." : "Revert"}
									</Button>
								)}
							</div>
							<DetailMeta detail={detail} />
						</DialogHeader>

						{detail.fileChangeDetail && (
							<Tabs
								defaultValue="diff"
								className="mt-2 flex min-h-0 flex-1 flex-col"
							>
								<div className="shrink-0">
									{!detail.fileExists && (
										<div className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
											File no longer exists on disk.
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

function DetailMeta({ detail }: { detail: ActivityDetail }) {
	return (
		<div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
			<span className="flex items-center gap-1">
				<Clock className="size-3" />
				{new Date(detail.createdAt).toLocaleString()}
			</span>
			{detail.fileChangeDetail && (
				<>
					<span className="text-border">|</span>
					<span className="font-mono">{detail.fileChangeDetail.filePath}</span>
					<span className="text-border">|</span>
					<Badge variant="outline" className="py-0 text-[10px]">
						{detail.fileChangeDetail.changeSource === "ai"
							? "AI"
							: detail.fileChangeDetail.changeSource}
					</Badge>
					{detail.fileChangeDetail.toolName && (
						<Badge variant="outline" className="py-0 text-[10px]">
							{detail.fileChangeDetail.toolName}
						</Badge>
					)}
					<span className="text-border">|</span>
					{detail.fileExists ? (
						detail.currentFileContent === detail.fileChangeDetail.newContent ? (
							<span className="flex items-center gap-1 text-green-600 dark:text-green-400">
								<CheckCircle className="size-3" />
								Current version
							</span>
						) : (
							<span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
								<PenLine className="size-3" />
								Modified since
							</span>
						)
					) : (
						<span className="text-red-500">File deleted</span>
					)}
				</>
			)}
		</div>
	);
}
