import { tool } from "ai";
import { z } from "zod";
import { readKanbanBoard, resolveKanbanPath, writeKanbanBoard } from "#/lib/board/board.server";
import { logger } from "#/lib/logger";

function boardError(toolName: string, userId: string, err: unknown, fallback: string): { error: string } {
  const message = err instanceof Error ? err.message : fallback;
  logger.warn({ tool: toolName, userId, err }, `Board tool ${toolName} failed: ${message}`);
  return { error: message };
}

export function createBoardListTasks(userId: string) {
  return tool({
    description:
      "List all tasks on the user's kanban board, grouped by column. Use this to check task statuses, find specific tasks, or get an overview of what's in progress. Optionally filter to a specific column.",
    inputSchema: z.object({
      column: z
        .string()
        .optional()
        .describe("Filter to a specific column name (e.g. 'In Progress', 'TODO'). Omit to list all columns."),
    }),
    execute: async ({ column }) => {
      const relativePath = await resolveKanbanPath(userId);
      if (!relativePath) {
        return { error: "No kanban board configured. The user needs to set one in Settings > Preferences." };
      }

      try {
        const { board } = await readKanbanBoard(userId);

        if (column) {
          const col = board.columns.find((c) => c.name.toLowerCase() === column.toLowerCase());
          if (!col) {
            return {
              error: `Column "${column}" not found. Available columns: ${board.columns.map((c) => c.name).join(", ")}`,
            };
          }
          return { columns: [{ name: col.name, tasks: col.tasks.map((t) => ({ text: t.text, checked: t.checked })) }] };
        }

        return {
          columns: board.columns.map((c) => ({
            name: c.name,
            tasks: c.tasks.map((t) => ({ text: t.text, checked: t.checked })),
          })),
        };
      } catch (err) {
        return boardError("board_list_tasks", userId, err, "Failed to read board");
      }
    },
  });
}

export function createBoardListColumns(userId: string) {
  return tool({
    description:
      "List all column names on the user's kanban board. Use this to discover available columns before adding or moving tasks.",
    inputSchema: z.object({}),
    execute: async () => {
      const relativePath = await resolveKanbanPath(userId);
      if (!relativePath) {
        return { error: "No kanban board configured. The user needs to set one in Settings > Preferences." };
      }

      try {
        const { board } = await readKanbanBoard(userId);
        return {
          columns: board.columns.map((c) => ({
            name: c.name,
            taskCount: c.tasks.length,
          })),
        };
      } catch (err) {
        return boardError("board_list_columns", userId, err, "Failed to read board");
      }
    },
  });
}

export function createBoardAddTask(userId: string) {
  return tool({
    description:
      "Add a new task to a specific column on the user's kanban board. The task will be added at the end of the column.",
    inputSchema: z.object({
      task: z.string().describe("The task text to add"),
      column: z.string().describe("The column name to add the task to (e.g. 'New', 'TODO', 'In Progress')"),
    }),
    execute: async ({ task, column }) => {
      try {
        const { board, absolutePath, relativePath, rawContent } = await readKanbanBoard(userId);

        const col = board.columns.find((c) => c.name.toLowerCase() === column.toLowerCase());
        if (!col) {
          return {
            error: `Column "${column}" not found. Available columns: ${board.columns.map((c) => c.name).join(", ")}`,
          };
        }

        col.tasks.push({ id: `task-${Date.now()}`, text: task, checked: false });

        await writeKanbanBoard(
          userId,
          absolutePath,
          relativePath,
          rawContent,
          board,
          `AI: Add task "${task}" to ${col.name}`,
          "ai",
        );

        return { success: true, column: col.name, task };
      } catch (err) {
        return boardError("board_add_task", userId, err, "Failed to add task");
      }
    },
  });
}

export function createBoardUpdateTask(userId: string) {
  return tool({
    description:
      "Update an existing task on the user's kanban board. You can change the task text and/or move it to a different column. Match the task by its current text.",
    inputSchema: z.object({
      task: z.string().describe("The current task text to find (must match exactly)"),
      newText: z.string().optional().describe("New text for the task. Omit to keep current text."),
      newColumn: z.string().optional().describe("Column to move the task to. Omit to keep in current column."),
    }),
    execute: async ({ task, newText, newColumn }) => {
      try {
        const { board, absolutePath, relativePath, rawContent } = await readKanbanBoard(userId);

        // Find the task across all columns
        let foundCol: (typeof board.columns)[0] | null = null;
        let foundIdx = -1;
        for (const col of board.columns) {
          const idx = col.tasks.findIndex((t) => t.text === task);
          if (idx !== -1) {
            foundCol = col;
            foundIdx = idx;
            break;
          }
        }

        if (!foundCol || foundIdx === -1) {
          return { error: `Task "${task}" not found on the board.` };
        }

        const changes: string[] = [];

        if (newText && newText !== foundCol.tasks[foundIdx].text) {
          foundCol.tasks[foundIdx].text = newText;
          changes.push(`renamed to "${newText}"`);
        }

        if (newColumn) {
          const targetCol = board.columns.find((c) => c.name.toLowerCase() === newColumn.toLowerCase());
          if (!targetCol) {
            return {
              error: `Column "${newColumn}" not found. Available columns: ${board.columns.map((c) => c.name).join(", ")}`,
            };
          }

          if (targetCol.name !== foundCol.name) {
            const [movedTask] = foundCol.tasks.splice(foundIdx, 1);
            targetCol.tasks.push(movedTask);
            changes.push(`moved from ${foundCol.name} to ${targetCol.name}`);
          }
        }

        if (changes.length === 0) {
          return { success: true, message: "No changes needed" };
        }

        const summary = `AI: Update task "${task}": ${changes.join(", ")}`;
        await writeKanbanBoard(userId, absolutePath, relativePath, rawContent, board, summary, "ai");

        return { success: true, changes };
      } catch (err) {
        return boardError("board_update_task", userId, err, "Failed to update task");
      }
    },
  });
}
