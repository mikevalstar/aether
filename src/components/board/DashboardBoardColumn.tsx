import { Link } from "@tanstack/react-router";
import { ArrowRight, Columns3 } from "lucide-react";
import type { KanbanColumn } from "#/lib/board/kanban-parser";

interface DashboardBoardColumnProps {
  column: KanbanColumn;
}

export function DashboardBoardColumn({ column }: DashboardBoardColumnProps) {
  return (
    <div className="flex flex-1 flex-col rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-subtle)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="inline-flex size-7 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]">
            <Columns3 className="size-3.5" strokeWidth={1.75} />
          </div>
          <h3 className="text-sm font-bold tracking-tight text-foreground">{column.name}</h3>
          <span className="text-xs text-muted-foreground">({column.tasks.length})</span>
        </div>
        <Link
          to="/p/$pluginId"
          params={{ pluginId: "board" }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] no-underline"
        >
          Board
          <ArrowRight className="size-3" />
        </Link>
      </div>
      {column.tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground">No tasks in this column.</p>
      ) : (
        <ul className="space-y-1">
          {column.tasks.map((task) => (
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
    </div>
  );
}
