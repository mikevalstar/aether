import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { useCallback, useRef, useState } from "react";
import type { KanbanColumn, KanbanTask } from "#/lib/board/kanban-parser";
import { BoardColumn } from "./BoardColumn";

interface BoardViewProps {
  columns: KanbanColumn[];
  onAddTask: (column: string, text: string) => Promise<void>;
  onRemoveTask: (column: string, index: number) => Promise<void>;
  onMoveTask: (fromColumn: string, fromIndex: number, toColumn: string, toIndex: number) => Promise<void>;
}

/**
 * Convert columns array to the record shape that `move()` expects:
 * { columnName: [taskId, ...], ... }
 */
function columnsToItems(columns: KanbanColumn[]): Record<string, string[]> {
  const items: Record<string, string[]> = {};
  for (const col of columns) {
    items[col.name] = col.tasks.map((t) => t.id);
  }
  return items;
}

/**
 * Apply an items record back onto columns, preserving task data.
 */
function applyItemsToColumns(items: Record<string, string[]>, columns: KanbanColumn[]): KanbanColumn[] {
  const taskMap = new Map<string, KanbanTask>();
  for (const col of columns) {
    for (const t of col.tasks) {
      taskMap.set(t.id, t);
    }
  }

  return columns.map((col) => ({
    ...col,
    tasks: (items[col.name] ?? []).map((id) => taskMap.get(id)).filter((t): t is KanbanTask => t != null),
  }));
}

export function BoardView({ columns: serverColumns, onAddTask, onRemoveTask, onMoveTask }: BoardViewProps) {
  const [columns, setColumns] = useState(serverColumns);
  const [isDragging, setIsDragging] = useState(false);
  const dragOrigin = useRef<{ column: string; index: number } | null>(null);

  // Sync from server when not dragging
  if (serverColumns !== columns && !isDragging) {
    setColumns(serverColumns);
  }

  const findTaskColumn = useCallback(
    (taskId: string) => {
      for (const col of columns) {
        const idx = col.tasks.findIndex((t) => t.id === taskId);
        if (idx !== -1) return { column: col.name, index: idx };
      }
      return null;
    },
    [columns],
  );

  return (
    <DragDropProvider
      onDragStart={(event) => {
        setIsDragging(true);
        const sourceId = event.operation.source?.id as string | undefined;
        if (sourceId) {
          const pos = findTaskColumn(sourceId);
          dragOrigin.current = pos;
        }
      }}
      onDragOver={(event) => {
        setColumns((prev) => {
          const items = columnsToItems(prev);
          const newItems = move(items, event);
          return applyItemsToColumns(newItems, prev);
        });
      }}
      onDragEnd={(event) => {
        setIsDragging(false);
        const origin = dragOrigin.current;
        dragOrigin.current = null;

        if (event.canceled || !origin) return;

        const sourceId = event.operation.source?.id as string | undefined;
        if (!sourceId) return;

        const final = findTaskColumn(sourceId);
        if (!final) return;

        if (origin.column !== final.column || origin.index !== final.index) {
          void onMoveTask(origin.column, origin.index, final.column, final.index);
        }
      }}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <BoardColumn key={col.name} column={col} onAddTask={onAddTask} onRemoveTask={onRemoveTask} />
        ))}
      </div>
    </DragDropProvider>
  );
}
