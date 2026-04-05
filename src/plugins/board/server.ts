import { readKanbanBoard, resolveKanbanPath } from "#/lib/board/board.server";
import { logger } from "#/lib/logger";
import type { AetherPluginServer } from "../types";

export const boardServer: AetherPluginServer = {
  async loadWidgetData(ctx) {
    const relativePath = await resolveKanbanPath(ctx.userId);
    if (!relativePath) {
      return { configured: false, columns: [], dashboardColumn: null };
    }

    try {
      const { board } = await readKanbanBoard(ctx.userId);
      const opts = await ctx.getOptions<{ dashboardColumn?: string }>();
      const dashboardColumn = opts.dashboardColumn ?? null;

      const column = dashboardColumn ? (board.columns.find((c) => c.name === dashboardColumn) ?? null) : null;

      return {
        configured: true,
        dashboardColumn: column ? { name: column.name, tasks: column.tasks } : null,
      };
    } catch (err) {
      logger.error({ err }, "Failed to load board widget data");
      return { configured: false, columns: [], dashboardColumn: null };
    }
  },
};
