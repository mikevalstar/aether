import { Link } from "@tanstack/react-router";
import cronstrue from "cronstrue";
import { AlertCircle, CheckCircle2, Clock, FileX, Loader2, Pencil, Play } from "lucide-react";
import { useState } from "react";
import { formatRelativeTime } from "#/components/activity/format-relative-time";
import { Button } from "#/components/ui/button";
import { toast } from "#/components/ui/sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import type { TaskListItem } from "#/lib/tasks/task.functions";
import { triggerTaskRun } from "#/lib/tasks/task.functions";

function formatCron(cron: string): string {
  try {
    return cronstrue.toString(cron);
  } catch {
    return cron;
  }
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-[var(--ink-faint)]">—</span>;
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">
        <CheckCircle2 className="size-3" />
        Success
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--destructive)]/30 bg-[oklch(from_var(--destructive)_l_c_h_/_0.08)] px-2 py-0.5 text-[11px] font-medium text-[var(--destructive)]">
      <AlertCircle className="size-3" />
      Error
    </span>
  );
}

function MutedTag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warn" }) {
  const cls =
    tone === "warn"
      ? "border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-300"
      : "border-[var(--line)] bg-[var(--bg)] text-[var(--ink-soft)]";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
      {children}
    </span>
  );
}

export function TaskTable({ items }: { items: TaskListItem[] }) {
  const [runningTasks, setRunningTasks] = useState<Set<string>>(new Set());

  async function handleRunNow(filename: string) {
    setRunningTasks((prev) => new Set(prev).add(filename));
    try {
      await triggerTaskRun({ data: { filename } });
      toast.success("Task triggered");
    } catch (err) {
      toast.error("Failed to trigger task", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setRunningTasks((prev) => {
        const next = new Set(prev);
        next.delete(filename);
        return next;
      });
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-md border border-[var(--line)] bg-[var(--accent-subtle)]">
      <Table>
        <TableHeader>
          <TableRow className="border-[var(--line)] hover:bg-transparent [&_th]:bg-transparent [&_th]:text-[11px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.12em] [&_th]:text-[var(--accent)]">
            <TableHead>Task</TableHead>
            <TableHead>Schedule</TableHead>
            <TableHead>Next Run</TableHead>
            <TableHead>Last Run</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[60px]" />
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isRunning = runningTasks.has(item.filename) || item.isBusy;
            const dimmed = !item.fileExists || !item.enabled;

            return (
              <TableRow
                key={item.id}
                className={`border-[var(--line)] transition-colors hover:bg-[oklch(from_var(--accent)_l_c_h_/_0.10)] ${dimmed ? "opacity-60" : ""}`}
              >
                <TableCell>
                  <Link
                    to="/tasks/$"
                    params={{ _splat: item.filename }}
                    className="font-medium text-[var(--ink)] transition-colors hover:text-[var(--accent)]"
                  >
                    {item.title}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--ink-soft)]">
                    <span className="font-mono text-[11px]">{item.model}</span>
                    {!item.fileExists && (
                      <MutedTag tone="warn">
                        <FileX className="size-3" />
                        File removed
                      </MutedTag>
                    )}
                    {!item.enabled && item.fileExists && <MutedTag>Paused</MutedTag>}
                  </div>
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger className="text-left text-sm text-[var(--ink)]">{formatCron(item.cron)}</TooltipTrigger>
                    <TooltipContent>
                      <code className="text-xs">{item.cron}</code>
                      {item.timezone && <div className="mt-1 text-xs text-[var(--ink-soft)]">{item.timezone}</div>}
                    </TooltipContent>
                  </Tooltip>
                  {item.timezone && <div className="text-xs text-[var(--ink-soft)]">{item.timezone}</div>}
                </TableCell>
                <TableCell className="text-sm text-[var(--ink)]">
                  {item.nextRun ? (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock className="size-3 text-[var(--ink-soft)]" />
                      {formatRelativeTime(item.nextRun)}
                    </span>
                  ) : (
                    <span className="text-[var(--ink-faint)]">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm tabular-nums text-[var(--ink)]">
                  {item.lastRunAt ? (
                    formatRelativeTime(item.lastRunAt)
                  ) : (
                    <span className="text-[var(--ink-faint)]">Never</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusPill status={item.lastRunStatus} />
                </TableCell>
                <TableCell>
                  {item.fileExists && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isRunning}
                      onClick={() => void handleRunNow(item.filename)}
                      title="Run now"
                    >
                      {isRunning ? (
                        <Loader2 className="size-4 animate-spin text-[var(--ink-soft)]" />
                      ) : (
                        <Play className="size-4 text-[var(--ink-soft)]" />
                      )}
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  {item.fileExists && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to="/tasks/editor/$" params={{ _splat: item.filename }} search={{ configure: false }}>
                            <Pencil className="size-4 text-[var(--ink-soft)]" />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit task</TooltipContent>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
