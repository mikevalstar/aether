import { promises as fs } from "node:fs";
import path from "node:path";
import { tool } from "ai";
import jmespath from "jmespath";
import { z } from "zod";
import { getIndexedNote } from "#/lib/obsidian/vault-index";

/**
 * AI Memory notes listing tool — exposed to the AI chat as `obsidian_ai_notes_list`.
 *
 * Recursively lists all notes inside the AI memory folder (configured via
 * OBSIDIAN_AI_MEMORY env var). Returns metadata for each note (path, title,
 * tags, aliases, headings, mtime). The AI can optionally filter by a subfolder,
 * search term (case-insensitive match against title/path/tags), and apply a
 * JMESPath expression to the results for structured filtering.
 */

type AiNoteEntry = {
	relativePath: string;
	title: string;
	tags: string[];
	aliases: string[];
	headings: string[];
	folder: string;
	mtime: number;
};

const AI_MEMORY_SUBFOLDERS = ["notes", "templates", "tasks", "workflows"];

/**
 * Ensure the AI memory folder and its subfolders exist.
 * Called at module load (fire-and-forget) and can be awaited if needed.
 */
export async function ensureAiMemoryFolders(): Promise<void> {
	const obsidianRoot = process.env.OBSIDIAN_DIR ?? "";
	const aiMemoryRel = process.env.OBSIDIAN_AI_MEMORY ?? "";

	if (!obsidianRoot || !aiMemoryRel) return;

	const memoryRoot = path.join(obsidianRoot, aiMemoryRel);

	for (const subfolder of AI_MEMORY_SUBFOLDERS) {
		const subPath = path.join(memoryRoot, subfolder);
		try {
			await fs.mkdir(subPath, { recursive: true });
		} catch {
			// ignore errors (e.g. permissions)
		}
	}
}

// Auto-create folders on import
void ensureAiMemoryFolders();

async function listNotesRecursively(
	obsidianRoot: string,
	absoluteDir: string,
	relativePrefix: string,
): Promise<AiNoteEntry[]> {
	let entries: import("node:fs").Dirent[];
	try {
		entries = await fs.readdir(absoluteDir, { withFileTypes: true });
	} catch {
		return [];
	}

	const results: AiNoteEntry[] = [];

	for (const entry of entries) {
		if (entry.name.startsWith(".")) continue;

		const relativePath = relativePrefix
			? path.posix.join(relativePrefix, entry.name)
			: entry.name;

		if (entry.isDirectory()) {
			const nested = await listNotesRecursively(
				obsidianRoot,
				path.join(absoluteDir, entry.name),
				relativePath,
			);
			results.push(...nested);
		} else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
			const indexed = await getIndexedNote(relativePath);
			results.push({
				relativePath,
				title: indexed?.title ?? entry.name.replace(/\.md$/i, ""),
				tags: indexed?.tags ?? [],
				aliases: indexed?.aliases ?? [],
				headings: indexed?.headings ?? [],
				folder: indexed?.folder ?? path.dirname(relativePath),
				mtime: indexed?.mtime ?? 0,
			});
		}
	}

	return results;
}

export const obsidianAiNotesList = tool({
	description:
		"List all notes in your AI memory folder recursively. Returns metadata (path, title, tags, headings, mtime) for each note. Use this to find your own notes, templates, and task instructions. Optionally filter by subfolder, search term, or JMESPath expression.",
	inputSchema: z.object({
		subfolder: z
			.string()
			.optional()
			.describe(
				"Optional subfolder within the AI memory directory to scope the listing, e.g. 'notes', 'templates', 'tasks'",
			),
		search: z
			.string()
			.optional()
			.describe(
				"Optional case-insensitive search term to filter results by title, path, or tags",
			),
		filter: z
			.string()
			.optional()
			.describe(
				'Optional JMESPath expression applied to the results array for structured filtering, e.g. "[?contains(tags, \'important\')]" or "[].{path: relativePath, title: title}"',
			),
	}),
	execute: async ({ subfolder, search, filter }) => {
		const obsidianRoot = process.env.OBSIDIAN_DIR ?? "";
		const aiMemoryRel = process.env.OBSIDIAN_AI_MEMORY ?? "";

		if (!obsidianRoot || !aiMemoryRel) {
			return { error: "AI memory folder is not configured." };
		}

		const targetRel = subfolder
			? path.posix.join(aiMemoryRel, subfolder.replace(/\\/g, "/"))
			: aiMemoryRel;

		// Validate no path traversal
		if (targetRel.includes("..") || targetRel.startsWith("/")) {
			return { error: "Invalid subfolder path." };
		}

		const absoluteTarget = path.join(obsidianRoot, targetRel);
		const resolvedTarget = path.resolve(absoluteTarget);
		const resolvedRoot = path.resolve(obsidianRoot);

		if (!resolvedTarget.startsWith(resolvedRoot)) {
			return { error: "Path traversal detected." };
		}

		let notes = await listNotesRecursively(
			obsidianRoot,
			absoluteTarget,
			targetRel,
		);

		// Apply search filter
		if (search) {
			const lower = search.toLowerCase();
			notes = notes.filter(
				(note) =>
					note.title.toLowerCase().includes(lower) ||
					note.relativePath.toLowerCase().includes(lower) ||
					note.tags.some((tag) => tag.toLowerCase().includes(lower)),
			);
		}

		// Sort by mtime descending (most recently modified first)
		notes.sort((a, b) => b.mtime - a.mtime);

		// Apply JMESPath filter if provided
		if (filter) {
			try {
				const filtered = jmespath.search(notes, filter);
				return {
					folder: targetRel,
					notes: filtered,
					totalFound: Array.isArray(filtered) ? filtered.length : 1,
				};
			} catch (err) {
				return {
					error: `Invalid JMESPath expression: ${err instanceof Error ? err.message : String(err)}`,
				};
			}
		}

		return {
			folder: targetRel,
			notes,
			totalFound: notes.length,
		};
	},
});
