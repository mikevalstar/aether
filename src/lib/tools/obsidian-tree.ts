import { promises as fs } from "node:fs";
import path from "node:path";
import { tool } from "ai";
import { z } from "zod";

function getObsidianRoot() {
	return process.env.OBSIDIAN_DIR ?? "";
}

type TreeEntry = {
	type: "folder" | "file";
	name: string;
	path: string;
	children?: TreeEntry[];
};

export const obsidianTree = tool({
	description:
		"Get the folder and file tree structure of the user's Obsidian vault. Returns the full hierarchy of folders and markdown files. Use this to understand how the vault is organized before searching, reading, or writing notes.",
	inputSchema: z.object({
		root: z
			.string()
			.optional()
			.describe(
				"Optional relative path to start from, e.g. 'Projects'. Defaults to the vault root.",
			),
	}),
	execute: async ({ root }) => {
		const obsidianRoot = getObsidianRoot();
		if (!obsidianRoot) {
			return { error: "Obsidian vault is not configured." };
		}

		const startDir = root?.replace(/\\/g, "/").trim() ?? "";
		if (startDir.includes("..") || startDir.startsWith("/")) {
			return { error: "Invalid path." };
		}

		const absoluteStart = startDir
			? path.join(obsidianRoot, startDir)
			: obsidianRoot;

		const resolvedStart = path.resolve(absoluteStart);
		if (!resolvedStart.startsWith(path.resolve(obsidianRoot))) {
			return { error: "Path traversal detected." };
		}

		try {
			await fs.access(absoluteStart);
		} catch {
			return { error: `Directory not found: ${startDir || "(vault root)"}` };
		}

		const tree = await buildTree(obsidianRoot, startDir);

		return {
			root: startDir || "/",
			tree,
		};
	},
});

async function buildTree(
	obsidianRoot: string,
	relativeDir: string,
): Promise<TreeEntry[]> {
	const absoluteDir = path.join(obsidianRoot, relativeDir);
	let entries: import("node:fs").Dirent[];
	try {
		entries = await fs.readdir(absoluteDir, { withFileTypes: true });
	} catch {
		return [];
	}

	const nodes: TreeEntry[] = [];

	for (const entry of entries) {
		if (entry.name.startsWith(".")) continue;

		const relativePath = relativeDir
			? path.posix.join(relativeDir, entry.name)
			: entry.name;

		if (entry.isDirectory()) {
			const children = await buildTree(obsidianRoot, relativePath);
			if (children.length > 0) {
				nodes.push({
					type: "folder",
					name: entry.name,
					path: relativePath,
					children,
				});
			}
			continue;
		}

		if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;

		nodes.push({
			type: "file",
			name: entry.name,
			path: relativePath,
		});
	}

	return nodes.sort((a, b) => {
		if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
		return a.name.localeCompare(b.name);
	});
}
