/**
 * Server-only board helpers. These must NOT be imported from client/route code.
 * They are used by AI tools and by the createServerFn handlers in board.functions.ts.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { logFileChange } from "#/lib/activity";
import { type KanbanBoard, parseKanbanFile, serializeKanbanBoard } from "#/lib/board/kanban-parser";
import { logger } from "#/lib/logger";
import { OBSIDIAN_DIR } from "#/lib/obsidian/obsidian";
import { getUserPreference } from "#/lib/preferences.server";

export async function resolveKanbanPath(userId: string): Promise<string | null> {
  return (await getUserPreference(userId, "kanbanFile")) ?? null;
}

export function getAbsolutePath(relativePath: string): string {
  const obsidianRoot = OBSIDIAN_DIR;
  if (!obsidianRoot) throw new Error("Obsidian vault not configured");

  const normalized = relativePath.replace(/\\/g, "/").trim();
  if (!normalized || normalized.includes("..") || normalized.startsWith("/")) {
    throw new Error("Invalid file path");
  }

  const absolutePath = path.join(obsidianRoot, normalized);
  const resolvedPath = path.resolve(absolutePath);
  const resolvedRoot = path.resolve(obsidianRoot);
  if (!resolvedPath.startsWith(resolvedRoot)) {
    throw new Error("Path traversal detected");
  }

  return absolutePath;
}

export async function readKanbanBoard(
  userId: string,
): Promise<{ board: KanbanBoard; absolutePath: string; relativePath: string; rawContent: string }> {
  const relativePath = await resolveKanbanPath(userId);
  if (!relativePath) throw new Error("No kanban file configured. Set one in Settings > Preferences.");

  const absolutePath = getAbsolutePath(relativePath);
  const rawContent = await fs.readFile(absolutePath, "utf8");
  const board = parseKanbanFile(rawContent);

  return { board, absolutePath, relativePath, rawContent };
}

export async function writeKanbanBoard(
  userId: string,
  absolutePath: string,
  relativePath: string,
  originalContent: string,
  board: KanbanBoard,
  summary: string,
  changeSource: "manual" | "ai" = "manual",
) {
  const newContent = serializeKanbanBoard(board);
  await fs.writeFile(absolutePath, newContent, "utf8");

  try {
    await logFileChange({
      userId,
      filePath: relativePath,
      originalContent,
      newContent,
      changeSource,
      summary,
    });
  } catch (err) {
    logger.error({ err }, "Activity log failed for board change");
  }
}
