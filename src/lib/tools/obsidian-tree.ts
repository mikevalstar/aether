import { promises as fs } from "node:fs";
import path from "node:path";
import { tool } from "ai";
import { z } from "zod";

function getObsidianRoot() {
	return process.env.OBSIDIAN_DIR ?? "";
}

function validatePath(obsidianRoot: string, inputPath?: string) {
	if (!obsidianRoot) {
		return { error: "Obsidian vault is not configured." } as const;
	}

	const sanitized = inputPath?.replace(/\\/g, "/").trim() ?? "";
	if (sanitized.includes("..") || sanitized.startsWith("/")) {
		return { error: "Invalid path." } as const;
	}

	const absoluteStart = sanitized
		? path.join(obsidianRoot, sanitized)
		: obsidianRoot;

	const resolvedStart = path.resolve(absoluteStart);
	if (!resolvedStart.startsWith(path.resolve(obsidianRoot))) {
		return { error: "Path traversal detected." } as const;
	}

	return { sanitized, absoluteStart };
}

type FolderEntry = {
	name: string;
	path: string;
	children?: FolderEntry[];
};

export const obsidianFolders = tool({
	description:
		"Get the full folder tree structure of the user's Obsidian vault (folders only, no files). Use this to understand how the vault is organized before navigating into specific folders.",
	inputSchema: z.object({}),
	execute: async () => {
		const obsidianRoot = getObsidianRoot();
		const validation = validatePath(obsidianRoot);
		if ("error" in validation) return validation;

		const tree = await buildFolderTree(obsidianRoot, "");

		return { tree };
	},
});

async function buildFolderTree(
	obsidianRoot: string,
	relativeDir: string,
): Promise<FolderEntry[]> {
	const absoluteDir = path.join(obsidianRoot, relativeDir);
	let entries: import("node:fs").Dirent[];
	try {
		entries = await fs.readdir(absoluteDir, { withFileTypes: true });
	} catch {
		return [];
	}

	const folders: FolderEntry[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name.startsWith(".")) continue;

		const relativePath = relativeDir
			? path.posix.join(relativeDir, entry.name)
			: entry.name;

		const children = await buildFolderTree(obsidianRoot, relativePath);

		folders.push({
			name: entry.name,
			path: relativePath,
			...(children.length > 0 ? { children } : {}),
		});
	}

	return folders.sort((a, b) => a.name.localeCompare(b.name));
}

type ListEntry = {
	type: "folder" | "file";
	name: string;
	path: string;
};

export const obsidianList = tool({
	description:
		"List the contents of a single folder in the user's Obsidian vault. Returns the immediate files and subfolders (non-recursive). Use this after obsidian_folders to explore a specific directory.",
	inputSchema: z.object({
		folder: z
			.string()
			.optional()
			.describe(
				"Relative path to the folder to list, e.g. 'Projects'. Defaults to the vault root.",
			),
	}),
	execute: async ({ folder }) => {
		const obsidianRoot = getObsidianRoot();
		const validation = validatePath(obsidianRoot, folder);
		if ("error" in validation) return validation;

		const { sanitized, absoluteStart } = validation;

		try {
			await fs.access(absoluteStart);
		} catch {
			return {
				error: `Directory not found: ${sanitized || "(vault root)"}`,
			};
		}

		const entries = await fs.readdir(absoluteStart, { withFileTypes: true });
		const items: ListEntry[] = [];

		for (const entry of entries) {
			if (entry.name.startsWith(".")) continue;

			const relativePath = sanitized
				? path.posix.join(sanitized, entry.name)
				: entry.name;

			if (entry.isDirectory()) {
				items.push({ type: "folder", name: entry.name, path: relativePath });
			} else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
				items.push({ type: "file", name: entry.name, path: relativePath });
			}
		}

		items.sort((a, b) => {
			if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
			return a.name.localeCompare(b.name);
		});

		return {
			folder: sanitized || "/",
			items,
		};
	},
});
