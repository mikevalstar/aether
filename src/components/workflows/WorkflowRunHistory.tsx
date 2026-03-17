import { useRouter } from "@tanstack/react-router";
import { AlertCircle, ChevronDown, ChevronRight, MessageSquare, Trash2 } from "lucide-react";
import { Fragment, useState } from "react";
import { RunMessages } from "#/components/shared/RunMessages";
import { Button } from "#/components/ui/button";
import { toast } from "#/components/ui/sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import type { WorkflowRunItem } from "#/lib/workflow.functions";
import { convertWorkflowToChat, deleteWorkflowRun } from "#/lib/workflow.functions";

function RunDetail({ run }: { run: WorkflowRunItem }) {
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

export function WorkflowRunHistory({ runs }: { runs: WorkflowRunItem[] }) {
	const router = useRouter();
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
	const [convertingIds, setConvertingIds] = useState<Set<string>>(new Set());

	async function handleDelete(threadId: string) {
		setDeletingIds((prev) => new Set(prev).add(threadId));
		try {
			await deleteWorkflowRun({ data: { threadId } });
			toast.success("Run deleted");
			router.invalidate();
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

	async function handleConvertToChat(threadId: string) {
		setConvertingIds((prev) => new Set(prev).add(threadId));
		try {
			await convertWorkflowToChat({ data: { threadId } });
			toast.success("Converted to chat", {
				description: "You can continue this conversation in Chat.",
			});
			router.invalidate();
		} catch (err) {
			toast.error("Conversion failed", {
				description: err instanceof Error ? err.message : "Unknown error",
			});
		} finally {
			setConvertingIds((prev) => {
				const next = new Set(prev);
				next.delete(threadId);
				return next;
			});
		}
	}

	if (runs.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
				<AlertCircle className="size-8 text-muted-foreground mb-3" />
				<p className="text-sm text-muted-foreground">No runs yet for this workflow.</p>
			</div>
		);
	}

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-8" />
						<TableHead>Time</TableHead>
						<TableHead>Model</TableHead>
						<TableHead>Tokens</TableHead>
						<TableHead>Cost</TableHead>
						<TableHead className="w-[120px]" />
					</TableRow>
				</TableHeader>
				<TableBody>
					{runs.map((run) => {
						const isExpanded = expandedId === run.id;
						const isDeleting = deletingIds.has(run.id);
						const isConverting = convertingIds.has(run.id);
						const isConvertedOrChat = run.type === "chat";

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
										<div className="flex items-center gap-1">
											{!isConvertedOrChat && (
												<Button
													variant="ghost"
													size="sm"
													disabled={isConverting}
													title="Continue in Chat"
													onClick={(e) => {
														e.stopPropagation();
														void handleConvertToChat(run.id);
													}}
												>
													<MessageSquare className="size-4 text-muted-foreground" />
												</Button>
											)}
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
										</div>
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
	);
}
