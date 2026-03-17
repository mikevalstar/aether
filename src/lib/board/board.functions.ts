import { createServerFn } from "@tanstack/react-start";
import { ensureSession } from "#/lib/auth.functions";
import { readKanbanBoard, resolveKanbanPath, writeKanbanBoard } from "#/lib/board/board.server";
import type { KanbanColumn } from "#/lib/board/kanban-parser";
import { logger } from "#/lib/logger";

// --- Server functions (safe to import from route/client code) ---

export const getBoardData = createServerFn({ method: "GET" }).handler(async () => {
	const session = await ensureSession();
	const relativePath = await resolveKanbanPath(session.user.id);

	if (!relativePath) {
		return { configured: false, columns: [] as KanbanColumn[] };
	}

	try {
		const { board } = await readKanbanBoard(session.user.id);
		return { configured: true, columns: board.columns };
	} catch (err) {
		logger.error({ err }, "Failed to read kanban board");
		return { configured: false, columns: [] as KanbanColumn[] };
	}
});

type AddTaskInput = { column: string; text: string };

export const addBoardTask = createServerFn({ method: "POST" })
	.inputValidator((data: AddTaskInput) => data)
	.handler(async ({ data }) => {
		const session = await ensureSession();
		const { board, absolutePath, relativePath, rawContent } = await readKanbanBoard(session.user.id);

		const col = board.columns.find((c) => c.name === data.column);
		if (!col) throw new Error(`Column "${data.column}" not found`);

		col.tasks.push({ id: `task-${Date.now()}`, text: data.text, checked: false });

		await writeKanbanBoard(session.user.id, absolutePath, relativePath, rawContent, board, `Add task: ${data.text}`);
		return { success: true, columns: board.columns };
	});

type RemoveTaskInput = { column: string; taskIndex: number };

export const removeBoardTask = createServerFn({ method: "POST" })
	.inputValidator((data: RemoveTaskInput) => data)
	.handler(async ({ data }) => {
		const session = await ensureSession();
		const { board, absolutePath, relativePath, rawContent } = await readKanbanBoard(session.user.id);

		const col = board.columns.find((c) => c.name === data.column);
		if (!col) throw new Error(`Column "${data.column}" not found`);
		if (data.taskIndex < 0 || data.taskIndex >= col.tasks.length) throw new Error("Invalid task index");

		const removed = col.tasks.splice(data.taskIndex, 1);

		await writeKanbanBoard(
			session.user.id,
			absolutePath,
			relativePath,
			rawContent,
			board,
			`Remove task: ${removed[0]?.text}`,
		);
		return { success: true, columns: board.columns };
	});

type MoveTaskInput = {
	fromColumn: string;
	fromIndex: number;
	toColumn: string;
	toIndex: number;
};

export const moveBoardTask = createServerFn({ method: "POST" })
	.inputValidator((data: MoveTaskInput) => data)
	.handler(async ({ data }) => {
		const session = await ensureSession();
		const { board, absolutePath, relativePath, rawContent } = await readKanbanBoard(session.user.id);

		const fromCol = board.columns.find((c) => c.name === data.fromColumn);
		const toCol = board.columns.find((c) => c.name === data.toColumn);
		if (!fromCol) throw new Error(`Column "${data.fromColumn}" not found`);
		if (!toCol) throw new Error(`Column "${data.toColumn}" not found`);
		if (data.fromIndex < 0 || data.fromIndex >= fromCol.tasks.length) throw new Error("Invalid source index");

		const [task] = fromCol.tasks.splice(data.fromIndex, 1);
		const clampedToIndex = Math.min(data.toIndex, toCol.tasks.length);
		toCol.tasks.splice(clampedToIndex, 0, task);

		const summary =
			data.fromColumn === data.toColumn
				? `Reorder task: ${task.text}`
				: `Move task "${task.text}" from ${data.fromColumn} to ${data.toColumn}`;

		await writeKanbanBoard(session.user.id, absolutePath, relativePath, rawContent, board, summary);
		return { success: true, columns: board.columns };
	});
