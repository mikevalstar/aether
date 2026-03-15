import { promises as fs } from "node:fs";
import path from "node:path";
import { tool } from "ai";
import { z } from "zod";
import type { ObsidianToolContext } from "./obsidian-context";

function getObsidianRoot() {
	return process.env.OBSIDIAN_DIR ?? "";
}

export function createObsidianWrite(ctx: ObsidianToolContext) {
	return tool({
		description:
			"Write or create a note in the user's Obsidian vault. Can create new files or update existing ones. IMPORTANT: Use obsidian_read before overwriting an existing file so you can incorporate its current content rather than replacing it blindly. Prefer obsidian_edit for targeted changes to existing notes. When updating existing notes, focus on adding content rather than removing content unless the user explicitly asks you to remove something. If creating a new file, include appropriate frontmatter.",
		inputSchema: z.object({
			relativePath: z
				.string()
				.describe(
					"The relative path for the file within the vault, e.g. 'folder/note.md'. Must end in .md",
				),
			content: z
				.string()
				.describe("The full markdown content to write to the file"),
		}),
		execute: async ({ relativePath, content }) => {
			const obsidianRoot = getObsidianRoot();
			if (!obsidianRoot) {
				return { error: "Obsidian vault is not configured." };
			}

			const normalized = relativePath.replace(/\\/g, "/").trim();
			if (
				!normalized ||
				normalized.includes("..") ||
				normalized.startsWith("/")
			) {
				return { error: "Invalid file path." };
			}

			if (!normalized.toLowerCase().endsWith(".md")) {
				return { error: "Only markdown (.md) files can be written." };
			}

			const absolutePath = path.join(obsidianRoot, normalized);
			const resolvedPath = path.resolve(absolutePath);
			const resolvedRoot = path.resolve(obsidianRoot);

			if (!resolvedPath.startsWith(resolvedRoot)) {
				return { error: "Path traversal detected." };
			}

			try {
				const readModifiedAt = ctx.readFiles.get(normalized);
				let fileExists = false;
				let currentMtime: string | null = null;

				try {
					const stat = await fs.stat(absolutePath);
					fileExists = true;
					currentMtime = stat.mtime.toISOString();
				} catch {
					fileExists = false;
				}

				if (fileExists) {
					if (!readModifiedAt) {
						return {
							error:
								"You must use obsidian_read on this path before overwriting an existing file. Please read the file first and incorporate its current content.",
						};
					}

					if (currentMtime !== readModifiedAt) {
						return {
							error:
								"The file has been modified since you last read it. Please use obsidian_read again to get the latest content before writing.",
						};
					}
				}

				const dir = path.dirname(absolutePath);
				await fs.mkdir(dir, { recursive: true });
				await fs.writeFile(absolutePath, content, "utf8");
				const updatedStat = await fs.stat(absolutePath);
				ctx.readFiles.set(normalized, updatedStat.mtime.toISOString());

				return {
					relativePath: normalized,
					success: true,
					message: "File written successfully.",
				};
			} catch (err) {
				return {
					error: `Could not write file: ${err instanceof Error ? err.message : String(err)}`,
				};
			}
		},
	});
}
