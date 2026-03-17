import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import type { KanbanColumn } from "#/lib/board/kanban-parser";
import { BoardTask } from "./BoardTask";

interface BoardColumnProps {
	column: KanbanColumn;
	onAddTask: (column: string, text: string) => void;
	onRemoveTask: (column: string, index: number) => void;
}

export function BoardColumn({ column, onAddTask, onRemoveTask }: BoardColumnProps) {
	const [newTask, setNewTask] = useState("");
	const [isAdding, setIsAdding] = useState(false);

	const { setNodeRef } = useDroppable({
		id: `column-${column.name}`,
		data: { column: column.name },
	});

	const handleAdd = () => {
		const text = newTask.trim();
		if (!text) return;
		onAddTask(column.name, text);
		setNewTask("");
		setIsAdding(false);
	};

	return (
		<div className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/30">
			<div className="flex items-center justify-between border-b border-border px-3 py-2">
				<h3 className="text-sm font-semibold">{column.name}</h3>
				<span className="text-xs text-muted-foreground">{column.tasks.length}</span>
			</div>

			<div ref={setNodeRef} className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-2" style={{ minHeight: 60 }}>
				<SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
					{column.tasks.map((task, i) => (
						<BoardTask key={task.id} task={task} columnName={column.name} index={i} onRemove={onRemoveTask} />
					))}
				</SortableContext>
			</div>

			<div className="border-t border-border p-2">
				{isAdding ? (
					<form
						onSubmit={(e) => {
							e.preventDefault();
							handleAdd();
						}}
						className="flex flex-col gap-1.5"
					>
						<Input
							autoFocus
							placeholder="Task text..."
							value={newTask}
							onChange={(e) => setNewTask(e.target.value)}
							className="h-8 text-sm"
						/>
						<div className="flex gap-1.5">
							<Button type="submit" size="sm" className="h-7 text-xs">
								Add
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-7 text-xs"
								onClick={() => {
									setIsAdding(false);
									setNewTask("");
								}}
							>
								Cancel
							</Button>
						</div>
					</form>
				) : (
					<Button
						variant="ghost"
						size="sm"
						className="w-full justify-start text-xs text-muted-foreground"
						onClick={() => setIsAdding(true)}
					>
						<Plus className="mr-1 size-3.5" />
						Add task
					</Button>
				)}
			</div>
		</div>
	);
}
