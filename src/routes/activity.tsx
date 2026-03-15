import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { createPatch } from "diff";
import { Clock, FileText, History, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { GlowBg } from "#/components/ui/glow-bg";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "#/components/ui/pagination";
import { SectionLabel } from "#/components/ui/section-label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import {
	type ActivityDetail,
	type ActivityListResult,
	getActivityDetail,
	getActivityList,
	revertFileChange,
} from "#/lib/activity.functions";
import { getSession } from "#/lib/auth.functions";

const activitySearchSchema = z.object({
	page: z.coerce.number().optional(),
	type: z.string().optional(),
	detail: z.string().optional(),
});

export const Route = createFileRoute("/activity")({
	validateSearch: activitySearchSchema,
	beforeLoad: async () => {
		const session = await getSession();
		if (!session) {
			throw redirect({ to: "/login" });
		}
	},
	loaderDeps: ({ search }) => ({
		page: search.page,
		type: search.type,
	}),
	loader: async ({ deps }) => {
		return await getActivityList({ data: deps });
	},
	component: ActivityPage,
});

const TYPE_FILTERS = [
	{ value: "all", label: "All" },
	{ value: "file_change", label: "File Changes" },
];

function ActivityPage() {
	const navigate = useNavigate({ from: Route.fullPath });
	const data = Route.useLoaderData() as ActivityListResult;
	const search = Route.useSearch();
	const activeType = search.type ?? "all";
	const detailId = search.detail;

	const [detailData, setDetailData] = useState<ActivityDetail | null>(null);
	const [detailLoading, setDetailLoading] = useState(false);
	const [reverting, setReverting] = useState(false);
	const loadedDetailRef = useRef<string | null>(null);

	async function openDetail(id: string) {
		setDetailLoading(true);
		loadedDetailRef.current = id;
		void navigate({ search: { ...search, detail: id }, replace: true });
		try {
			const result = await getActivityDetail({ data: { id } });
			setDetailData(result);
		} finally {
			setDetailLoading(false);
		}
	}

	function closeDetail() {
		setDetailData(null);
		loadedDetailRef.current = null;
		const { detail: _, ...rest } = search;
		void navigate({ search: rest, replace: true });
	}

	async function handleRevert(activityLogId: string) {
		setReverting(true);
		try {
			await revertFileChange({ data: { activityLogId } });
			closeDetail();
		} finally {
			setReverting(false);
		}
	}

	// Auto-load detail if URL has detail param on mount/navigation
	useEffect(() => {
		if (detailId && detailId !== loadedDetailRef.current) {
			loadedDetailRef.current = detailId;
			setDetailLoading(true);
			getActivityDetail({ data: { id: detailId } })
				.then((result) => setDetailData(result))
				.finally(() => setDetailLoading(false));
		}
	}, [detailId]);

	return (
		<main className="relative overflow-hidden">
			<GlowBg
				color="var(--teal)"
				size="size-[500px]"
				position="-right-48 -top-48"
			/>

			<div className="page-wrap relative px-4 pb-16 pt-10 sm:pt-12">
				<section className="mb-8">
					<SectionLabel icon={History} color="text-[var(--teal)]">
						Activity
					</SectionLabel>
					<h1 className="display-title mt-4 mb-2 text-3xl font-bold tracking-tight sm:text-4xl">
						Activity <span className="text-[var(--teal)]">log</span>
					</h1>
					<p className="max-w-2xl text-sm text-muted-foreground">
						Track all file changes made by AI tools and manual edits.
					</p>
				</section>

				<section className="mb-4 flex gap-2">
					{TYPE_FILTERS.map((filter) => (
						<Button
							key={filter.value}
							variant={activeType === filter.value ? "default" : "outline"}
							size="sm"
							onClick={() =>
								void navigate({
									search: {
										page: 1,
										type: filter.value === "all" ? undefined : filter.value,
									},
									replace: true,
								})
							}
						>
							{filter.label}
						</Button>
					))}
				</section>

				{data.items.length === 0 ? (
					<section className="surface-card flex flex-col items-center justify-center px-6 py-16 text-center">
						<div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-[var(--teal)]/10 text-[var(--teal)]">
							<History className="size-6" strokeWidth={1.5} />
						</div>
						<h2 className="text-lg font-semibold">No activity yet</h2>
						<p className="mt-2 max-w-md text-sm text-muted-foreground">
							File changes from AI tools and manual edits will appear here.
						</p>
					</section>
				) : (
					<>
						<section className="surface-card overflow-hidden">
							<table className="min-w-full table-fixed border-separate border-spacing-0 text-sm">
								<colgroup>
									<col className="w-[180px]" />
									<col className="w-[100px]" />
									<col />
									<col className="w-[120px]" />
								</colgroup>
								<thead>
									<tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
										<th className="border-b border-border px-4 py-3 font-semibold">
											When
										</th>
										<th className="border-b border-border px-4 py-3 font-semibold">
											Type
										</th>
										<th className="border-b border-border px-4 py-3 font-semibold">
											Summary
										</th>
										<th className="border-b border-border px-4 py-3 font-semibold">
											Source
										</th>
									</tr>
								</thead>
								<tbody>
									{data.items.map((item) => (
										<tr
											key={item.id}
											className="cursor-pointer transition-colors hover:bg-muted/50"
											onClick={() => void openDetail(item.id)}
										>
											<td className="border-b border-border/50 px-4 py-3 text-muted-foreground">
												<div className="flex items-center gap-1.5">
													<Clock className="size-3.5" />
													{formatRelativeTime(item.createdAt)}
												</div>
											</td>
											<td className="border-b border-border/50 px-4 py-3">
												<Badge variant="outline" className="text-xs">
													{item.type === "file_change" ? (
														<>
															<FileText className="mr-1 size-3" />
															File
														</>
													) : (
														item.type
													)}
												</Badge>
											</td>
											<td className="border-b border-border/50 px-4 py-3">
												<span className="font-medium">{item.summary}</span>
												{item.fileChangeDetail && (
													<span className="ml-2 text-xs text-muted-foreground">
														{item.fileChangeDetail.filePath}
													</span>
												)}
											</td>
											<td className="border-b border-border/50 px-4 py-3">
												{item.fileChangeDetail && (
													<Badge
														variant={
															item.fileChangeDetail.changeSource === "ai"
																? "default"
																: "secondary"
														}
														className="text-xs"
													>
														{item.fileChangeDetail.changeSource}
													</Badge>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</section>

						{data.totalPages > 1 && (
							<section className="mt-4 flex justify-center">
								<Pagination>
									<PaginationContent>
										{data.page > 1 && (
											<PaginationItem>
												<PaginationPrevious
													onClick={() =>
														void navigate({
															search: {
																...search,
																page: data.page - 1,
															},
															replace: true,
														})
													}
												/>
											</PaginationItem>
										)}
										{Array.from({ length: data.totalPages }, (_, i) => i + 1)
											.filter(
												(p) =>
													p === 1 ||
													p === data.totalPages ||
													Math.abs(p - data.page) <= 2,
											)
											.map((p) => (
												<PaginationItem key={p}>
													<PaginationLink
														isActive={p === data.page}
														onClick={() =>
															void navigate({
																search: { ...search, page: p },
																replace: true,
															})
														}
													>
														{p}
													</PaginationLink>
												</PaginationItem>
											))}
										{data.page < data.totalPages && (
											<PaginationItem>
												<PaginationNext
													onClick={() =>
														void navigate({
															search: {
																...search,
																page: data.page + 1,
															},
															replace: true,
														})
													}
												/>
											</PaginationItem>
										)}
									</PaginationContent>
								</Pagination>
							</section>
						)}
					</>
				)}
			</div>

			{/* Detail Dialog */}
			<Dialog open={!!detailData || detailLoading} onOpenChange={closeDetail}>
				<DialogContent
					className="flex h-[80vh] max-w-4xl flex-col overflow-hidden sm:max-w-4xl"
					aria-describedby={undefined}
				>
					{detailLoading ? (
						<DialogHeader>
							<DialogTitle className="text-muted-foreground">
								Loading...
							</DialogTitle>
						</DialogHeader>
					) : detailData ? (
						<>
							<DialogHeader className="shrink-0">
								<div className="flex items-center justify-between gap-4 pr-8">
									<DialogTitle className="flex items-center gap-2">
										<History className="size-5 text-[var(--teal)]" />
										{detailData.summary}
									</DialogTitle>
									{detailData.fileChangeDetail && (
										<Button
											variant="destructive"
											size="sm"
											disabled={reverting}
											onClick={() => void handleRevert(detailData.id)}
										>
											<RotateCcw className="mr-1.5 size-3.5" />
											{reverting ? "Reverting..." : "Revert"}
										</Button>
									)}
								</div>
								<p className="text-xs text-muted-foreground">
									{new Date(detailData.createdAt).toLocaleString()}
									{detailData.fileChangeDetail && (
										<>
											{" · "}
											<span className="font-mono">
												{detailData.fileChangeDetail.filePath}
											</span>
											{" · "}
											{detailData.fileChangeDetail.changeSource}
											{detailData.fileChangeDetail.toolName &&
												` via ${detailData.fileChangeDetail.toolName}`}
										</>
									)}
								</p>
							</DialogHeader>

							{detailData.fileChangeDetail && (
								<Tabs
									defaultValue="diff"
									className="mt-2 flex min-h-0 flex-1 flex-col"
								>
									<div className="shrink-0">
										{!detailData.fileExists && (
											<div className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
												File no longer exists on disk.
											</div>
										)}
										<TabsList>
											<TabsTrigger value="diff">Diff</TabsTrigger>
											<TabsTrigger value="original">Original</TabsTrigger>
											<TabsTrigger value="new">New</TabsTrigger>
											{detailData.fileExists && (
												<TabsTrigger value="current">Current</TabsTrigger>
											)}
										</TabsList>
									</div>

									<TabsContent
										value="diff"
										className="mt-3 min-h-0 flex-1 overflow-y-auto"
									>
										<DiffView
											original={
												detailData.fileChangeDetail.originalContent ?? ""
											}
											modified={detailData.fileChangeDetail.newContent}
											filePath={detailData.fileChangeDetail.filePath}
										/>
									</TabsContent>

									<TabsContent
										value="original"
										className="mt-3 min-h-0 flex-1 overflow-y-auto"
									>
										<ContentView
											content={
												detailData.fileChangeDetail.originalContent ??
												"(new file — no original content)"
											}
										/>
									</TabsContent>

									<TabsContent
										value="new"
										className="mt-3 min-h-0 flex-1 overflow-y-auto"
									>
										<ContentView
											content={detailData.fileChangeDetail.newContent}
										/>
									</TabsContent>

									{detailData.fileExists && (
										<TabsContent
											value="current"
											className="mt-3 min-h-0 flex-1 overflow-y-auto"
										>
											<ContentView
												content={detailData.currentFileContent ?? ""}
											/>
										</TabsContent>
									)}
								</Tabs>
							)}
						</>
					) : null}
				</DialogContent>
			</Dialog>
		</main>
	);
}

function ContentView({ content }: { content: string }) {
	return (
		<pre className="overflow-x-auto rounded-md border bg-muted/30 p-4 text-xs leading-relaxed">
			{content}
		</pre>
	);
}

function DiffView({
	original,
	modified,
	filePath,
}: {
	original: string;
	modified: string;
	filePath: string;
}) {
	if (!original && modified) {
		return (
			<div className="rounded-md border bg-muted/30">
				<div className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground">
					New file
				</div>
				<pre className="overflow-x-auto p-4 text-xs leading-relaxed">
					{modified.split("\n").map((line, lineIdx) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: diff lines lack stable IDs
							key={lineIdx}
							className="text-green-700 dark:text-green-400"
						>
							<span className="mr-3 inline-block w-8 text-right text-muted-foreground">
								{lineIdx + 1}
							</span>
							+{line}
						</div>
					))}
				</pre>
			</div>
		);
	}

	const patch = createPatch(filePath, original, modified, "", "", {
		context: 3,
	});
	const lines = patch.split("\n");
	// Skip the first 4 header lines (diff ---, +++, etc)
	const diffLines = lines.slice(4);

	return (
		<div className="rounded-md border bg-muted/30">
			<div className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground">
				Unified diff
			</div>
			<pre className="overflow-x-auto p-4 text-xs leading-relaxed">
				{diffLines.map((line, lineIdx) => {
					let className = "";
					if (line.startsWith("+")) {
						className = "bg-green-500/10 text-green-700 dark:text-green-400";
					} else if (line.startsWith("-")) {
						className = "bg-red-500/10 text-red-700 dark:text-red-400";
					} else if (line.startsWith("@@")) {
						className =
							"text-blue-600 dark:text-blue-400 font-semibold mt-2 mb-1";
					} else {
						className = "text-muted-foreground";
					}

					return (
						// biome-ignore lint/suspicious/noArrayIndexKey: diff lines lack stable IDs
						<div key={lineIdx} className={className}>
							{line}
						</div>
					);
				})}
			</pre>
		</div>
	);
}

function formatRelativeTime(isoString: string) {
	const date = new Date(isoString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return "Just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;

	return date.toLocaleDateString();
}
