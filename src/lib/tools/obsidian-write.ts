import { promises as fs } from "node:fs";
import path from "node:path";
import { tool } from "ai";
import { z } from "zod";

function getObsidianRoot() {
	return process.env.OBSIDIAN_DIR ?? "";
}

export const obsidianWrite = tool({
	description:
		"Write or create a note in the user's Obsidian vault. Can create new files or update existing ones. IMPORTANT: Always use obsidian_read on the target path first to check if the file already exists — if it does, incorporate the existing content rather than overwriting it. When updating existing notes, focus on adding content rather than removing content unless the user explicitly asks you to remove something. If creating a new file, include appropriate frontmatter.",
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
			const dir = path.dirname(absolutePath);
			await fs.mkdir(dir, { recursive: true });
			await fs.writeFile(absolutePath, content, "utf8");

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
