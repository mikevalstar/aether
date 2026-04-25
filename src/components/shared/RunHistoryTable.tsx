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
    <div className="max-h-[600px] overflow-y-auto border-t border-[var(--line)] bg-[var(--bg)] px-5 py-4">
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
      <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-[var(--line)] bg-[rgb(229,222,207)] p-12 text-center dark:bg-[rgb(39,67,122)]">
        <AlertCircle className="mb-3 size-8 text-[var(--ink-faint)]" />
        <p className="text-sm text-[var(--ink-soft)]">No runs yet for this {emptyLabel}.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-[var(--line)] bg-[rgb(229,222,207)] dark:bg-[rgb(39,67,122)]">
      <Table>
        <TableHeader>
          <TableRow className="border-[var(--line)] hover:bg-transparent [&_th]:bg-transparent [&_th]:text-[11px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.12em] [&_th]:text-[var(--accent)]">
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
                  className={`cursor-pointer border-[var(--line)] transition-colors hover:bg-[oklch(from_var(--accent)_l_c_h_/_0.10)] ${
                    highlightId === run.id ? "bg-[oklch(from_var(--accent)_l_c_h_/_0.14)]" : ""
                  }`}
                  onClick={() => setExpandedId(isExpanded ? null : run.id)}
                >
                  <TableCell>
                    {isExpanded ? (
                      <ChevronDown className="size-4 text-[var(--ink-soft)]" />
                    ) : (
                      <ChevronRight className="size-4 text-[var(--ink-soft)]" />
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-[var(--ink)]">{formatDateTime(run.createdAt)}</TableCell>
                  <TableCell className="font-mono text-xs text-[var(--ink-soft)]">{run.model}</TableCell>
                  <TableCell className="text-sm tabular-nums text-[var(--ink)]">
                    {(
                      (run.aggregateInputTokens ?? run.totalInputTokens) +
                      (run.aggregateOutputTokens ?? run.totalOutputTokens)
                    ).toLocaleString()}
                    {run.subAgentCount ? (
                      <span className="ml-1.5 rounded-full bg-[var(--accent-subtle)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                        +{run.subAgentCount}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-[var(--ink)]">
                    {formatCost(run.aggregateEstimatedCostUsd ?? run.totalEstimatedCostUsd)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
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
                          <MessageSquare className="size-4 text-[var(--ink-soft)]" />
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
                        <Trash2 className="size-4 text-[var(--ink-soft)]" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow className="border-[var(--line)] hover:bg-transparent">
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
