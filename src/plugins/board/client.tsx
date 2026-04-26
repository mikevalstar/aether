import { Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, Columns3, Settings } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { BoardView } from "#/components/board/BoardView";
import { WidgetCard } from "#/components/dashboard/WidgetCard";
import { toast } from "#/components/ui/sonner";
import { addBoardTask, getBoardData, moveBoardTask, removeBoardTask } from "#/lib/board/board.functions";
import type { KanbanColumn } from "#/lib/board/kanban-parser";
import type { AetherPluginClient, PluginWidget } from "../types";
import { BoardSettingsComponent } from "./settings";

// ─── Board Page ───

function BoardPage() {
  const router = useRouter();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Load board data on mount
  useEffect(() => {
    getBoardData({ data: {} })
      .then((data) => {
        setConfigured(data.configured);
        setColumns(data.columns);
      })
      .catch(() => setConfigured(false))
      .finally(() => setLoading(false));
  }, []);

  const refreshColumns = useCallback((newColumns: KanbanColumn[]) => {
    setColumns(newColumns);
  }, []);

  const handleAddTask = useCallback(
    async (column: string, text: string) => {
      try {
        const result = await addBoardTask({ data: { column, text } });
        if (result.success) refreshColumns(result.columns);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add task");
        router.invalidate();
      }
    },
    [refreshColumns, router],
  );

  const handleRemoveTask = useCallback(
    async (column: string, index: number) => {
      try {
        const result = await removeBoardTask({ data: { column, taskIndex: index } });
        if (result.success) refreshColumns(result.columns);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to remove task");
        router.invalidate();
      }
    },
    [refreshColumns, router],
  );

  const handleMoveTask = useCallback(
    async (fromColumn: string, fromIndex: number, toColumn: string, toIndex: number) => {
      try {
        const result = await moveBoardTask({ data: { fromColumn, fromIndex, toColumn, toIndex } });
        if (result.success) refreshColumns(result.columns);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to move task");
        router.invalidate();
      }
    },
    [refreshColumns, router],
  );

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (!configured) {
    return (
      <div className="surface-card max-w-md p-6 text-center">
        <Columns3 className="mx-auto mb-3 size-10 text-muted-foreground/50" />
        <p className="mb-1 font-medium">No board configured</p>
        <p className="mb-4 text-sm text-muted-foreground">
          Select an Obsidian Kanban file in the plugin settings to get started.
        </p>
        <Link
          to="/settings/plugins/$pluginId"
          params={{ pluginId: "board" }}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <Settings className="size-3.5" />
          Go to Settings
        </Link>
      </div>
    );
  }

  return (
    <BoardView columns={columns} onAddTask={handleAddTask} onRemoveTask={handleRemoveTask} onMoveTask={handleMoveTask} />
  );
}

// ─── Dashboard Widget ───

function BoardColumnWidget({
  data,
}: {
  ctx: { pluginId: string; options: Record<string, unknown> };
  data: Record<string, unknown>;
}) {
  const configured = data.configured as boolean;
  const dashboardColumn = data.dashboardColumn as KanbanColumn | null;

  if (!configured || !dashboardColumn) {
    return (
      <WidgetCard icon={Columns3} title="Board">
        <p className="text-xs text-muted-foreground">
          {!configured
            ? "Not configured. Go to Settings > Plugins > Board to set up."
            : "No dashboard column selected. Go to Settings > Plugins > Board to choose one."}
        </p>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      icon={Columns3}
      title={
        <span className="flex items-baseline gap-1.5">
          <span className="font-semibold text-foreground">{dashboardColumn.name}</span>
          <span className="text-xs text-muted-foreground tabular-nums">({dashboardColumn.tasks.length})</span>
        </span>
      }
      action={
        <Link
          to="/p/$pluginId"
          params={{ pluginId: "board" }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] no-underline"
        >
          Board
          <ArrowRight className="size-3" />
        </Link>
      }
    >
      {dashboardColumn.tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground">No tasks in this column.</p>
      ) : (
        <ul className="space-y-1">
          {dashboardColumn.tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-start gap-2 rounded-md border border-border bg-background/50 px-3 py-1.5 text-sm"
            >
              <span
                className={`mt-0.5 size-3.5 shrink-0 rounded border ${task.checked ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-muted-foreground/30"} inline-flex items-center justify-center`}
              >
                {task.checked && (
                  <svg
                    className="size-2.5"
                    viewBox="0 0 10 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                    role="presentation"
                  >
                    <path d="M2 5l2.5 2.5L8 3" />
                  </svg>
                )}
              </span>
              <span className={task.checked ? "text-muted-foreground line-through" : ""}>{task.text}</span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

const boardColumnWidget: PluginWidget = {
  id: "board-column",
  label: "Board Column",
  size: "quarter",
  component: BoardColumnWidget,
};

// ─── Client Export ───

export const boardClient: AetherPluginClient = {
  SettingsComponent: BoardSettingsComponent,
  widgets: [boardColumnWidget],
  commands: [
    {
      label: "Kanban Board",
      icon: Columns3,
      route: "/p/board",
    },
    {
      label: "Board Settings",
      icon: Settings,
      route: "/settings/plugins/board",
    },
  ],
  pages: [
    {
      id: "board",
      label: "Board",
      icon: Columns3,
      component: BoardPage,
    },
  ],
};
