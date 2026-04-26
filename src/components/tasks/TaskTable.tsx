import { Link, useNavigate } from "@tanstack/react-router";
import cronstrue from "cronstrue";
import { Clock, FileX, Loader2, Pencil, Play } from "lucide-react";
import { useState } from "react";
import { formatRelativeTime } from "#/components/activity/format-relative-time";
import { Badge } from "#/components/ui/badge";
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

function StatusPill({ status, busy }: { status: string | null; busy?: boolean }) {
  if (busy) {
    return (
      <Badge variant="warning" size="glyph" aria-label="Running" title="Running">
        ▸
      </Badge>
    );
  }
  if (!status) return <span className="text-xs text-[var(--ink-faint)]">—</span>;
  if (status === "success") {
    return (
      <Badge variant="success" size="glyph" aria-label="Success" title="Success">
        ✓
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" size="glyph" aria-label="Error" title="Error">
      ✕
    </Badge>
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
            <Badge variant="model-name">{item.model}</Badge>
            {!item.fileExists && (
              <Badge variant="warning">
                <FileX />
                File removed
              </Badge>
            )}
            {!item.enabled && item.fileExists && <Badge variant="ghost">Paused</Badge>}
          </div>
        </div>
      ),
    },
    {
      key: "schedule",
      header: "Schedule",
      mono: true,
      cell: (item) => (
        <Tooltip>
          <TooltipTrigger className="text-left text-[12.5px] text-[var(--ink)]">
            {formatCron(item.cron)}
            {item.timezone && <span className="ml-1.5 text-[var(--ink-faint)]">{item.timezone}</span>}
          </TooltipTrigger>
          <TooltipContent>
            <span className="font-mono text-xs">{item.cron}</span>
            {item.timezone && <div className="mt-1 text-xs opacity-80">{item.timezone}</div>}
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      key: "next",
      header: "Next Run",
      mono: true,
      cell: (item) =>
        item.nextRun ? (
          <span className="inline-flex items-center gap-1 text-[12.5px] text-[var(--ink)]">
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
      mono: true,
      cell: (item) =>
        item.lastRunAt ? (
          <span className="text-[12.5px] text-[var(--ink)]">{formatRelativeTime(item.lastRunAt)}</span>
        ) : (
          <span className="text-[var(--ink-faint)]">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (item) => <StatusPill status={item.lastRunStatus} busy={item.isBusy} />,
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
