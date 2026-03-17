import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: task.id,
		data: { column: columnName, index },
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`group flex items-start gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-sm ${
				isDragging ? "opacity-50 shadow-lg" : ""
			}`}
			{...attributes}
		>
			<button
				type="button"
				className="mt-0.5 shrink-0 cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
				{...listeners}
			>
				<GripVertical className="size-3.5" />
			</button>
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
