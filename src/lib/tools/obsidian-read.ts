import { promises as fs } from "node:fs";
import path from "node:path";
import { tool } from "ai";
import { z } from "zod";
import type { ObsidianToolContext } from "./obsidian-context";

function getObsidianRoot() {
	return process.env.OBSIDIAN_DIR ?? "";
}

export function createObsidianRead(ctx: ObsidianToolContext) {
	return tool({
		description:
			"Read the contents of a note from the user's Obsidian vault. Returns the full markdown content including frontmatter. Use obsidian_search first to find the correct file path if you don't know it.",
		inputSchema: z.object({
			relativePath: z.string().describe("The relative path to the file within the vault, e.g. 'folder/note.md'"),
		}),
		execute: async ({ relativePath }) => {
			const obsidianRoot = getObsidianRoot();
			if (!obsidianRoot) {
				return { error: "Obsidian vault is not configured." };
			}

			const normalized = relativePath.replace(/\\/g, "/").trim();
			if (!normalized || normalized.includes("..") || normalized.startsWith("/")) {
				return { error: "Invalid file path." };
			}

			const absolutePath = path.join(obsidianRoot, normalized);
			const resolvedPath = path.resolve(absolutePath);
			const resolvedRoot = path.resolve(obsidianRoot);

			if (!resolvedPath.startsWith(resolvedRoot)) {
				return { error: "Path traversal detected." };
			}

			try {
				const [content, stat] = await Promise.all([fs.readFile(absolutePath, "utf8"), fs.stat(absolutePath)]);
				const modifiedAt = stat.mtime.toISOString();

				// Track this read so obsidian_write can verify it
				ctx.readFiles.set(normalized, modifiedAt);

				return {
					relativePath: normalized,
					content,
					modifiedAt,
				};
			} catch (err) {
				return {
					error: `Could not read file: ${err instanceof Error ? err.message : String(err)}`,
				};
			}
		},
	});
}
