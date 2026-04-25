import { Link, useNavigate } from "@tanstack/react-router";
import cronstrue from "cronstrue";
import { AlertCircle, CheckCircle2, Clock, FileX, Loader2, Pencil, Play } from "lucide-react";
import { useState } from "react";
import { formatRelativeTime } from "#/components/activity/format-relative-time";
import { Button } from "#/components/ui/button";
import { DataTable, type DataTableColumn } from "#/components/ui/data-table";
import { toast } from "#/components/ui/sonner";
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
  const navigate = useNavigate();
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

  const columns: DataTableColumn<TaskListItem>[] = [
    {
      key: "task",
      header: "Task",
      cell: (item) => (
        <div className={!item.fileExists || !item.enabled ? "opacity-60" : ""}>
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
        </div>
      ),
    },
    {
      key: "schedule",
      header: "Schedule",
      cell: (item) => (
        <>
          <Tooltip>
            <TooltipTrigger className="text-left text-sm text-[var(--ink)]">{formatCron(item.cron)}</TooltipTrigger>
            <TooltipContent>
              <span className="font-mono text-xs">{item.cron}</span>
              {item.timezone && <div className="mt-1 text-xs opacity-80">{item.timezone}</div>}
            </TooltipContent>
          </Tooltip>
          {item.timezone && <div className="text-xs text-[var(--ink-soft)]">{item.timezone}</div>}
        </>
      ),
    },
    {
      key: "next",
      header: "Next Run",
      cell: (item) =>
        item.nextRun ? (
          <span className="inline-flex items-center gap-1 tabular-nums text-sm text-[var(--ink)]">
            <Clock className="size-3 text-[var(--ink-soft)]" />
            {formatRelativeTime(item.nextRun)}
          </span>
        ) : (
          <span className="text-[var(--ink-faint)]">—</span>
        ),
    },
    {
      key: "last",
      header: "Last Run",
      cell: (item) =>
        item.lastRunAt ? (
          <span className="text-sm tabular-nums text-[var(--ink)]">{formatRelativeTime(item.lastRunAt)}</span>
        ) : (
          <span className="text-[var(--ink-faint)]">Never</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (item) => <StatusPill status={item.lastRunStatus} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (item) => {
        const isRunning = runningTasks.has(item.filename) || item.isBusy;
        return (
          <div className="flex items-center justify-end gap-1">
            {item.fileExists && (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={isRunning}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleRunNow(item.filename);
                  }}
                  title="Run now"
                >
                  {isRunning ? (
                    <Loader2 className="size-4 animate-spin text-[var(--ink-soft)]" />
                  ) : (
                    <Play className="size-4 text-[var(--ink-soft)]" />
                  )}
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-sm" asChild onClick={(e) => e.stopPropagation()}>
                      <Link to="/tasks/editor/$" params={{ _splat: item.filename }} search={{ configure: false }}>
                        <Pencil className="size-4 text-[var(--ink-soft)]" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit task</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      title="Tasks"
      count={items.length}
      data={items}
      columns={columns}
      rowKey={(item) => item.id}
      showChevron
      onRowClick={(item) => navigate({ to: "/tasks/$", params: { _splat: item.filename } })}
    />
  );
}
