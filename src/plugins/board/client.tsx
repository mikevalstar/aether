import { Link } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import { ArrowRight, Columns3, Settings } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { BoardView } from "#/components/board/BoardView";
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
    getBoardData()
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
    return (
      <main className="page-wrap px-4 pb-12 pt-10">
        <section className="mb-8 max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">Tasks</p>
          <h1 className="display-title text-3xl font-bold tracking-tight sm:text-4xl">Board</h1>
        </section>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </main>
    );
  }

  if (!configured) {
    return (
      <main className="page-wrap px-4 pb-12 pt-10">
        <section className="mb-8 max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">Tasks</p>
          <h1 className="display-title text-3xl font-bold tracking-tight sm:text-4xl">Board</h1>
        </section>

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
      </main>
    );
  }

  return (
    <main className="px-4 pb-12 pt-10">
      <section className="page-wrap mb-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">Tasks</p>
        <h1 className="display-title text-3xl font-bold tracking-tight sm:text-4xl">Board</h1>
      </section>

      <BoardView columns={columns} onAddTask={handleAddTask} onRemoveTask={handleRemoveTask} onMoveTask={handleMoveTask} />
    </main>
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
      <div className="surface-card rounded-lg p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Columns3 className="size-4" />
          Board
        </div>
        <p className="text-xs text-muted-foreground">
          {!configured
            ? "Not configured. Go to Settings > Plugins > Board to set up."
            : "No dashboard column selected. Go to Settings > Plugins > Board to choose one."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col rounded-xl border border-[var(--teal)]/20 bg-[var(--teal-subtle)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="inline-flex size-7 items-center justify-center rounded-lg bg-[var(--teal-subtle)] text-[var(--teal)]">
            <Columns3 className="size-3.5" strokeWidth={1.75} />
          </div>
          <h3 className="text-sm font-bold tracking-tight text-foreground">{dashboardColumn.name}</h3>
          <span className="text-xs text-muted-foreground">({dashboardColumn.tasks.length})</span>
        </div>
        <Link to="/p/$pluginId" params={{ pluginId: "board" }} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--teal)] no-underline">
          Board
          <ArrowRight className="size-3" />
        </Link>
      </div>
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
                className={`mt-0.5 size-3.5 shrink-0 rounded border ${task.checked ? "border-[var(--teal)] bg-[var(--teal)] text-white" : "border-muted-foreground/30"} inline-flex items-center justify-center`}
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
    </div>
  );
}

const boardColumnWidget: PluginWidget = {
  id: "board-column",
  label: "Board Column",
  size: "half",
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
