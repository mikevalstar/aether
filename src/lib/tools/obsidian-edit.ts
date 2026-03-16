import { promises as fs } from "node:fs";
import path from "node:path";
import { tool } from "ai";
import { z } from "zod";
import { logFileChange } from "#/lib/activity";
import { logger } from "#/lib/logger";
import type { ObsidianToolContext } from "./obsidian-context";

function getObsidianRoot() {
	return process.env.OBSIDIAN_DIR ?? "";
}

export function createObsidianEdit(ctx: ObsidianToolContext) {
	return tool({
		description:
			"Edit a note in the user's Obsidian vault by replacing a specific text passage. Provide the exact text to find (old_string) and the replacement (new_string). The old_string must match exactly one location in the file. Prefer this tool over obsidian_write when making targeted changes to existing notes — it's faster and less error-prone. Use obsidian_write only for creating new files or when you need to rewrite the entire file. You must use obsidian_read first.",
		inputSchema: z.object({
			relativePath: z
				.string()
				.describe("The relative path for the file within the vault, e.g. 'folder/note.md'. Must end in .md"),
			old_string: z.string().describe("The exact text to find in the file"),
			new_string: z.string().describe("The replacement text (must differ from old_string)"),
		}),
		execute: async ({ relativePath, old_string, new_string }) => {
			const obsidianRoot = getObsidianRoot();
			if (!obsidianRoot) {
				return { error: "Obsidian vault is not configured." };
			}

			const normalized = relativePath.replace(/\\/g, "/").trim();
			if (!normalized || normalized.includes("..") || normalized.startsWith("/")) {
				return { error: "Invalid file path." };
			}

			if (!normalized.toLowerCase().endsWith(".md")) {
				return { error: "Only markdown (.md) files can be edited." };
			}

			if (old_string === new_string) {
				return {
					error: "old_string and new_string must be different.",
				};
			}

			const readModifiedAt = ctx.readFiles.get(normalized);
			if (!readModifiedAt) {
				return {
					error: "You must use obsidian_read on this path before editing it. Please read the file first.",
				};
			}

			const absolutePath = path.join(obsidianRoot, normalized);
			const resolvedPath = path.resolve(absolutePath);
			const resolvedRoot = path.resolve(obsidianRoot);

			if (!resolvedPath.startsWith(resolvedRoot)) {
				return { error: "Path traversal detected." };
			}

			try {
				const stat = await fs.stat(absolutePath);
				const currentMtime = stat.mtime.toISOString();
				if (currentMtime !== readModifiedAt) {
					return {
						error:
							"The file has been modified since you last read it. Please use obsidian_read again to get the latest content before editing.",
					};
				}

				const content = await fs.readFile(absolutePath, "utf8");

				const firstIndex = content.indexOf(old_string);
				if (firstIndex === -1) {
					return {
						error: "The specified text was not found in the file.",
					};
				}

				const secondIndex = content.indexOf(old_string, firstIndex + 1);
				if (secondIndex !== -1) {
					return {
						error: "The specified text appears multiple times. Provide more surrounding context to make it unique.",
					};
				}

				const updatedContent = content.replace(old_string, new_string);
				await fs.writeFile(absolutePath, updatedContent, "utf8");
				const updatedStat = await fs.stat(absolutePath);
				ctx.readFiles.set(normalized, updatedStat.mtime.toISOString());

				const fileName = path.basename(normalized);
				try {
					await logFileChange({
						userId: ctx.userId,
						filePath: normalized,
						originalContent: content,
						newContent: updatedContent,
						changeSource: "ai",
						toolName: "obsidian_edit",
						summary: `AI edited ${fileName}`,
						metadata: ctx.chatThreadId ? { chatThreadId: ctx.chatThreadId } : undefined,
					});
				} catch (err) {
					logger.error({ err }, "Activity log failed");
				}

				return {
					relativePath: normalized,
					success: true,
					message: "File edited successfully.",
				};
			} catch (err) {
				if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
					return {
						error: "File not found. Use obsidian_write to create new files.",
					};
				}
				return {
					error: `Could not edit file: ${err instanceof Error ? err.message : String(err)}`,
				};
			}
		},
	});
}
