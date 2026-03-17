import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { Columns3, Settings } from "lucide-react";
import { useCallback, useState } from "react";
import { BoardView } from "#/components/board/BoardView";
import { toast } from "#/components/ui/sonner";
import { getSession } from "#/lib/auth.functions";
import { addBoardTask, getBoardData, moveBoardTask, removeBoardTask } from "#/lib/board/board.functions";
import type { KanbanColumn } from "#/lib/board/kanban-parser";

export const Route = createFileRoute("/board")({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session) throw redirect({ to: "/login" });
	},
	loader: async () => await getBoardData(),
	component: BoardPage,
});

function BoardPage() {
	const data = Route.useLoaderData();
	const router = useRouter();
	const [columns, setColumns] = useState<KanbanColumn[]>(data.columns);

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

	if (!data.configured) {
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
						Select an Obsidian Kanban file in your preferences to get started.
					</p>
					<Link
						to="/settings/preferences"
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
