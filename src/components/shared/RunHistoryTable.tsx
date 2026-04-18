import { useRouter } from "@tanstack/react-router";
import { AlertCircle, ChevronDown, ChevronRight, MessageSquare, Trash2 } from "lucide-react";
import { Fragment, useState } from "react";
import { RunMessages } from "#/components/shared/RunMessages";
import { Button } from "#/components/ui/button";
import { toast } from "#/components/ui/sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import { formatCost, formatDateTime } from "#/lib/format";

export type RunItem = {
  id: string;
  type: string;
  model: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCostUsd: number;
  /** Aggregate across this run's parent thread and any sub-agent threads it spawned. */
  aggregateInputTokens?: number;
  aggregateOutputTokens?: number;
  aggregateEstimatedCostUsd?: number;
  subAgentCount?: number;
  createdAt: string;
  messagesJson: string;
  systemPromptJson: string | null;
  availableToolsJson: string | null;
};

export interface RunHistoryTableProps {
  /** The list of run items to display */
  runs: RunItem[];
  /** Server function to delete a run by thread ID */
  onDelete: (data: { data: { threadId: string } }) => Promise<unknown>;
  /** Server function to convert a run to a chat thread */
  onConvertToChat: (data: { data: { threadId: string } }) => Promise<unknown>;
  /** Label for empty state (e.g. "task" or "workflow") */
  emptyLabel?: string;
  /** Auto-expand and highlight this run ID (e.g. from a notification link) */
  highlightId?: string;
}

function RunDetail({ run }: { run: RunItem }) {
  return (
    <div className="max-h-[600px] overflow-y-auto bg-muted/50 px-4 py-3">
      <RunMessages
        messagesJson={run.messagesJson}
        systemPromptJson={run.systemPromptJson}
        availableToolsJson={run.availableToolsJson}
      />
    </div>
  );
}

export function RunHistoryTable({ runs, onDelete, onConvertToChat, emptyLabel = "run", highlightId }: RunHistoryTableProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(highlightId ?? null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [convertingIds, setConvertingIds] = useState<Set<string>>(new Set());

  async function handleDelete(threadId: string) {
    setDeletingIds((prev) => new Set(prev).add(threadId));
    try {
      await onDelete({ data: { threadId } });
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
      await onConvertToChat({ data: { threadId } });
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
        <AlertCircle className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No runs yet for this {emptyLabel}.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card">
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
            const isAlreadyChat = run.type === "chat";

            return (
              <Fragment key={run.id}>
                <TableRow
                  className={`cursor-pointer ${highlightId === run.id ? "bg-[var(--teal-subtle)]" : ""}`}
                  onClick={() => setExpandedId(isExpanded ? null : run.id)}
                >
                  <TableCell>
                    {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </TableCell>
                  <TableCell className="text-sm">{formatDateTime(run.createdAt)}</TableCell>
                  <TableCell className="text-sm">{run.model}</TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {(
                      (run.aggregateInputTokens ?? run.totalInputTokens) +
                      (run.aggregateOutputTokens ?? run.totalOutputTokens)
                    ).toLocaleString()}
                    {run.subAgentCount ? (
                      <span className="ml-1 text-[11px] font-medium text-[var(--teal)]">+{run.subAgentCount}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {formatCost(run.aggregateEstimatedCostUsd ?? run.totalEstimatedCostUsd)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {!isAlreadyChat && (
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
