import { useRouter } from "@tanstack/react-router";
import { AlertCircle, Bot, ChevronDown, ChevronRight, MessageSquare, Trash2, Wrench } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#/components/ui/collapsible";
import { toast } from "#/components/ui/sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import type { WorkflowRunItem } from "#/lib/workflow.functions";
import { convertWorkflowToChat, deleteWorkflowRun } from "#/lib/workflow.functions";

type ResponseMessageContent =
	| { type: "text"; text: string }
	| {
			type: "tool-call";
			toolCallId: string;
			toolName: string;
			input: unknown;
			[k: string]: unknown;
	  }
	| {
			type: "tool-result";
			toolCallId: string;
			toolName: string;
			output: unknown;
			[k: string]: unknown;
	  };

type ResponseMessage = {
	role: string;
	content: string | ResponseMessageContent[];
};

function parseMessages(json: string): ResponseMessage[] {
	try {
		const parsed = JSON.parse(json);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function truncateJson(value: unknown, maxLength = 500): string {
	const str = JSON.stringify(value, null, 2);
	if (str.length <= maxLength) return str;
	return `${str.slice(0, maxLength)}…`;
}

function ToolCallBlock({ toolName, input }: { toolName: string; input: unknown }) {
	return (
		<Collapsible>
			<CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground py-1">
				<Wrench className="size-3" />
				<span className="font-mono">{toolName}</span>
				<ChevronRight className="size-3 transition-transform [[data-state=open]>&]:rotate-90" />
			</CollapsibleTrigger>
			<CollapsibleContent>
				<pre className="mt-1 rounded bg-muted p-2 text-xs overflow-x-auto max-h-48 overflow-y-auto">
					{truncateJson(input)}
				</pre>
			</CollapsibleContent>
		</Collapsible>
	);
}

function ToolResultBlock({ toolName, output }: { toolName: string; output: unknown }) {
	return (
		<Collapsible>
			<CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-foreground py-1">
				<ChevronRight className="size-3 transition-transform [[data-state=open]>&]:rotate-90" />
				<span className="font-mono">{toolName}</span>
				<span className="text-muted-foreground">result</span>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<pre className="mt-1 rounded bg-muted p-2 text-xs overflow-x-auto max-h-48 overflow-y-auto">
					{truncateJson(output, 1000)}
				</pre>
			</CollapsibleContent>
		</Collapsible>
	);
}

function RunDetail({ run }: { run: WorkflowRunItem }) {
	const messages = parseMessages(run.messagesJson);

	if (messages.length === 0) {
		return (
			<div className="px-4 py-3 bg-muted/50 text-sm">
				<p className="text-muted-foreground italic">No messages recorded</p>
			</div>
		);
	}

	return (
		<div className="px-4 py-3 bg-muted/50 text-sm space-y-3 max-h-[600px] overflow-y-auto">
			{messages.map((msg, msgIdx) => {
				const msgKey = `${msg.role}-${msgIdx}`;

				if (msg.role === "assistant") {
					const content =
						typeof msg.content === "string"
							? [{ type: "text" as const, text: msg.content }]
							: Array.isArray(msg.content)
								? msg.content
								: [];

					const hasContent = content.length > 0;
					if (!hasContent) return null;

					return (
						<div key={msgKey} className="space-y-1">
							<div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
								<Bot className="size-3" />
								<span>Assistant</span>
							</div>
							{content.map((block) => {
								if (block.type === "text") {
									return (
										<div key={`${msgKey}-text`} className="whitespace-pre-wrap text-sm">
											{block.text}
										</div>
									);
								}
								if (block.type === "tool-call") {
									return <ToolCallBlock key={block.toolCallId} toolName={block.toolName} input={block.input} />;
								}
								return null;
							})}
						</div>
					);
				}

				if (msg.role === "tool") {
					const content = Array.isArray(msg.content) ? msg.content : [];
					if (content.length === 0) return null;

					return (
						<div key={msgKey} className="space-y-1 pl-4 border-l-2 border-emerald-200 dark:border-emerald-800">
							{content.map((block) => {
								if (block.type === "tool-result") {
									return (
										<ToolResultBlock key={block.toolCallId} toolName={block.toolName ?? "tool"} output={block.output} />
									);
								}
								return null;
							})}
						</div>
					);
				}

				return null;
			})}
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
							<>
								<TableRow key={run.id} className="cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : run.id)}>
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
									<TableRow key={`${run.id}-detail`}>
										<TableCell colSpan={6} className="p-0">
											<RunDetail run={run} />
										</TableCell>
									</TableRow>
								)}
							</>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}
