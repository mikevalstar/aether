import { Link } from "@tanstack/react-router";
import cronstrue from "cronstrue";
import { AlertCircle, CheckCircle2, Clock, FileX, Loader2, Play } from "lucide-react";
import { useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { toast } from "#/components/ui/sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import type { TaskListItem } from "#/lib/task.functions";
import { triggerTaskRun } from "#/lib/task.functions";

function formatCron(cron: string): string {
  try {
    return cronstrue.toString(cron);
  } catch {
    return cron;
  }
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diff = date.getTime() - now;
  const absDiff = Math.abs(diff);

  if (absDiff < 60_000) return "just now";
  if (absDiff < 3_600_000) {
    const mins = Math.round(absDiff / 60_000);
    return diff > 0 ? `in ${mins}m` : `${mins}m ago`;
  }
  if (absDiff < 86_400_000) {
    const hours = Math.round(absDiff / 3_600_000);
    return diff > 0 ? `in ${hours}h` : `${hours}h ago`;
  }
  const days = Math.round(absDiff / 86_400_000);
  return diff > 0 ? `in ${days}d` : `${days}d ago`;
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  if (status === "success")
    return (
      <Badge variant="outline" className="text-emerald-600 border-emerald-300">
        <CheckCircle2 className="mr-1 size-3" />
        Success
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-red-600 border-red-300">
      <AlertCircle className="mr-1 size-3" />
      Error
    </Badge>
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
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Schedule</TableHead>
            <TableHead>Next Run</TableHead>
            <TableHead>Last Run</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[80px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isRunning = runningTasks.has(item.filename) || item.isBusy;
            const dimmed = !item.fileExists || !item.enabled;

            return (
              <TableRow key={item.id} className={dimmed ? "opacity-50" : undefined}>
                <TableCell>
                  <Link to="/tasks/$" params={{ _splat: item.filename }} className="font-medium hover:underline">
                    {item.title}
                  </Link>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {item.model}
                    {!item.fileExists && (
                      <Badge variant="outline" className="ml-2 text-amber-600 border-amber-300">
                        <FileX className="mr-1 size-3" />
                        File removed
                      </Badge>
                    )}
                    {!item.enabled && item.fileExists && (
                      <Badge variant="outline" className="ml-2">
                        Paused
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger className="text-sm">{formatCron(item.cron)}</TooltipTrigger>
                    <TooltipContent>
                      <code>{item.cron}</code>
                      {item.timezone && <div className="mt-1 text-xs text-muted-foreground">{item.timezone}</div>}
                    </TooltipContent>
                  </Tooltip>
                  {item.timezone && <div className="text-xs text-muted-foreground">{item.timezone}</div>}
                </TableCell>
                <TableCell className="text-sm">
                  {item.nextRun ? (
                    <span className="flex items-center gap-1">
                      <Clock className="size-3 text-muted-foreground" />
                      {formatRelativeTime(item.nextRun)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {item.lastRunAt ? (
                    formatRelativeTime(item.lastRunAt)
                  ) : (
                    <span className="text-muted-foreground">Never</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={item.lastRunStatus} />
                </TableCell>
                <TableCell>
                  {item.fileExists && (
                    <Button variant="ghost" size="sm" disabled={isRunning} onClick={() => void handleRunNow(item.filename)}>
                      {isRunning ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                    </Button>
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
