import cronstrue from "cronstrue";
import { AlertCircle, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Fragment, useState } from "react";
import { RunMessages } from "#/components/shared/RunMessages";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { toast } from "#/components/ui/sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import type { TaskRunItem } from "#/lib/task.functions";
import { deleteTaskRun } from "#/lib/task.functions";

function RunDetail({ run }: { run: TaskRunItem }) {
	return (
		<div className="px-4 py-3 bg-muted/50 max-h-[600px] overflow-y-auto">
			<RunMessages
				messagesJson={run.messagesJson}
				systemPromptJson={run.systemPromptJson}
				availableToolsJson={run.availableToolsJson}
			/>
		</div>
	);
}

function formatDateTime(iso: string): string {
	return new Date(iso).toLocaleString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function formatCost(usd: number): string {
	if (usd < 0.01) return `$${usd.toFixed(6)}`;
	return `$${usd.toFixed(4)}`;
}

export function TaskRunHistory({
	task,
	runs,
}: {
	task: {
		filename: string;
		title: string;
		cron: string;
		model: string;
		effort: string;
		enabled: boolean;
		timezone: string | null;
		fileExists: boolean;
	};
	runs: TaskRunItem[];
}) {
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

	async function handleDelete(threadId: string) {
		setDeletingIds((prev) => new Set(prev).add(threadId));
		try {
			await deleteTaskRun({ data: { threadId } });
			toast.success("Run deleted");
		} catch (err) {
			toast.error("Delete failed", {
				description: err instanceof Error ? err.message : "Unknown error",
			});
		} finally {
			setDeletingIds((prev) => {
				const next = new Set(prev);
				next.delete(threadId);
				return next;
			});
		}
	}

	let cronHuman: string;
	try {
		cronHuman = cronstrue.toString(task.cron);
	} catch {
		cronHuman = task.cron;
	}

	return (
		<div>
			<div className="mb-6 space-y-1">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-sm text-muted-foreground">{cronHuman}</span>
					<code className="text-xs bg-muted px-1.5 py-0.5 rounded">{task.cron}</code>
					<Badge variant="outline" className="text-xs">
						{task.model}
					</Badge>
					{task.timezone && (
						<Badge variant="outline" className="text-xs">
							{task.timezone}
						</Badge>
					)}
					{!task.fileExists && (
						<Badge variant="outline" className="text-amber-600 border-amber-300">
							File removed
						</Badge>
					)}
					{!task.enabled && task.fileExists && <Badge variant="outline">Paused</Badge>}
				</div>
			</div>

			{runs.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
					<AlertCircle className="size-8 text-muted-foreground mb-3" />
					<p className="text-sm text-muted-foreground">No runs yet for this task.</p>
				</div>
			) : (
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-8" />
								<TableHead>Time</TableHead>
								<TableHead>Model</TableHead>
								<TableHead>Tokens</TableHead>
								<TableHead>Cost</TableHead>
								<TableHead className="w-[60px]" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{runs.map((run) => {
								const isExpanded = expandedId === run.id;
								const isDeleting = deletingIds.has(run.id);

								return (
									<Fragment key={run.id}>
										<TableRow className="cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : run.id)}>
											<TableCell>
												{isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
											</TableCell>
											<TableCell className="text-sm">{formatDateTime(run.createdAt)}</TableCell>
											<TableCell className="text-sm">{run.model}</TableCell>
											<TableCell className="text-sm tabular-nums">
												{(run.totalInputTokens + run.totalOutputTokens).toLocaleString()}
											</TableCell>
											<TableCell className="text-sm tabular-nums">{formatCost(run.totalEstimatedCostUsd)}</TableCell>
											<TableCell>
												<Button
													variant="ghost"
													size="sm"
													disabled={isDeleting}
													onClick={(e) => {
														e.stopPropagation();
														void handleDelete(run.id);
													}}
												>
													<Trash2 className="size-4 text-muted-foreground" />
												</Button>
											</TableCell>
										</TableRow>
										{isExpanded && (
											<TableRow>
												<TableCell colSpan={6} className="p-0">
													<RunDetail run={run} />
												</TableCell>
											</TableRow>
										)}
									</Fragment>
								);
							})}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}
