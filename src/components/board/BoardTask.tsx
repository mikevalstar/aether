import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "#/components/ui/button";
import type { KanbanTask } from "#/lib/board/kanban-parser";

interface BoardTaskProps {
  task: KanbanTask;
  columnName: string;
  index: number;
  onRemove: (column: string, index: number) => void;
}

export function BoardTask({ task, columnName, index, onRemove }: BoardTaskProps) {
  const { ref, isDragging } = useSortable({
    id: task.id,
    index,
    type: "item",
    accept: "item",
    group: columnName,
    transition: { duration: 200, easing: "cubic-bezier(0.25, 1, 0.5, 1)" },
  });

  return (
    <div
      ref={ref}
      data-dragging={isDragging || undefined}
      className={`group flex items-start gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-sm ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      <span className="mt-0.5 shrink-0 cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing">
        <GripVertical className="size-3.5" />
      </span>
      <span className="flex-1 break-words">{task.text}</span>
      <Button
        variant="ghost"
        size="icon"
        className="size-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onRemove(columnName, index)}
      >
        <Trash2 className="size-3" />
      </Button>
    </div>
  );
}
