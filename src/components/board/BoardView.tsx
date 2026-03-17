import {
	closestCorners,
	DndContext,
	type DragEndEvent,
	type DragOverEvent,
	DragOverlay,
	type DragStartEvent,
	MouseSensor,
	TouchSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useCallback, useState } from "react";
import type { KanbanColumn, KanbanTask } from "#/lib/board/kanban-parser";
import { BoardColumn } from "./BoardColumn";

interface BoardViewProps {
	columns: KanbanColumn[];
	onAddTask: (column: string, text: string) => Promise<void>;
	onRemoveTask: (column: string, index: number) => Promise<void>;
	onMoveTask: (fromColumn: string, fromIndex: number, toColumn: string, toIndex: number) => Promise<void>;
}

export function BoardView({ columns: serverColumns, onAddTask, onRemoveTask, onMoveTask }: BoardViewProps) {
	const [columns, setColumns] = useState(serverColumns);
	const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
	const [dragOrigin, setDragOrigin] = useState<{ column: string; index: number } | null>(null);

	// Update local state when server data changes
	if (serverColumns !== columns && !activeTask) {
		setColumns(serverColumns);
	}

	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
	);

	const findColumnForTask = useCallback(
		(taskId: string) => {
			for (const col of columns) {
				if (col.tasks.some((t) => t.id === taskId)) return col;
			}
			return null;
		},
		[columns],
	);

	const handleDragStart = (event: DragStartEvent) => {
		const taskId = event.active.id as string;
		const col = findColumnForTask(taskId);
		const task = col?.tasks.find((t) => t.id === taskId);
		setActiveTask(task ?? null);
		if (col) {
			const idx = col.tasks.findIndex((t) => t.id === taskId);
			setDragOrigin({ column: col.name, index: idx });
		}
	};

	const handleDragOver = (event: DragOverEvent) => {
		const { active, over } = event;
		if (!over) return;

		const activeId = active.id as string;
		const overId = over.id as string;

		const activeCol = findColumnForTask(activeId);
		if (!activeCol) return;

		// Determine target column
		let overCol: KanbanColumn | undefined;
		if (overId.startsWith("column-")) {
			const colName = overId.replace("column-", "");
			overCol = columns.find((c) => c.name === colName);
		} else {
			overCol = findColumnForTask(overId) ?? undefined;
		}
		if (!overCol || activeCol.name === overCol.name) return;

		// Move task to new column optimistically
		setColumns((prev) => {
			const newCols = prev.map((c) => ({ ...c, tasks: [...c.tasks] }));
			const fromCol = newCols.find((c) => c.name === activeCol.name);
			const toCol = newCols.find((c) => c.name === overCol.name);
			if (!fromCol || !toCol) return prev;

			const taskIdx = fromCol.tasks.findIndex((t) => t.id === activeId);
			if (taskIdx === -1) return prev;

			const [task] = fromCol.tasks.splice(taskIdx, 1);

			// Find insert position
			const overIdx = toCol.tasks.findIndex((t) => t.id === overId);
			if (overIdx !== -1) {
				toCol.tasks.splice(overIdx, 0, task);
			} else {
				toCol.tasks.push(task);
			}

			return newCols;
		});
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		const origin = dragOrigin;
		setActiveTask(null);
		setDragOrigin(null);

		if (!over || !origin) return;

		const activeId = active.id as string;
		const overId = over.id as string;

		const activeCol = findColumnForTask(activeId);
		if (!activeCol) return;

		// Same column reorder
		if (overId !== activeId && !overId.startsWith("column-")) {
			const overCol = findColumnForTask(overId);
			if (overCol && activeCol.name === overCol.name) {
				const oldIdx = activeCol.tasks.findIndex((t) => t.id === activeId);
				const newIdx = activeCol.tasks.findIndex((t) => t.id === overId);

				if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
					setColumns((prev) =>
						prev.map((c) => (c.name === activeCol.name ? { ...c, tasks: arrayMove(c.tasks, oldIdx, newIdx) } : c)),
					);
				}
			}
		}

		// Resolve final positions from current local state
		const finalCol = columns.find((c) => c.tasks.some((t) => t.id === activeId));
		if (!finalCol) return;

		const finalIdx = finalCol.tasks.findIndex((t) => t.id === activeId);

		if (origin.column !== finalCol.name || origin.index !== finalIdx) {
			void onMoveTask(origin.column, origin.index, finalCol.name, finalIdx);
		}
	};

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCorners}
			onDragStart={handleDragStart}
			onDragOver={handleDragOver}
			onDragEnd={handleDragEnd}
		>
			<div className="flex gap-4 overflow-x-auto pb-4">
				{columns.map((col) => (
					<BoardColumn key={col.name} column={col} onAddTask={onAddTask} onRemoveTask={onRemoveTask} />
				))}
			</div>

			<DragOverlay>
				{activeTask && (
					<div className="rounded-md border border-border bg-background px-3 py-2 text-sm shadow-lg">{activeTask.text}</div>
				)}
			</DragOverlay>
		</DndContext>
	);
}
