import { promises as fs } from "node:fs";
import path from "node:path";
import { tool } from "ai";
import { z } from "zod";

function getObsidianRoot() {
	return process.env.OBSIDIAN_DIR ?? "";
}

export const obsidianSearch = tool({
	description:
		"Search the user's Obsidian vault for notes matching a query. Returns file paths and titles of matching notes. Use this to find relevant notes before reading or writing them.",
	inputSchema: z.object({
		query: z
			.string()
			.describe("Search term to match against file names, titles, and content"),
	}),
	execute: async ({ query }) => {
		const obsidianRoot = getObsidianRoot();
		if (!obsidianRoot) {
			return { error: "Obsidian vault is not configured." };
		}

		const results: { relativePath: string; title: string; snippet: string }[] =
			[];
		const lowerQuery = query.toLowerCase();

		await searchDirectory(obsidianRoot, "", lowerQuery, results);

		if (results.length === 0) {
			return {
				query,
				matches: [],
				message: "No notes found matching the query.",
			};
		}

		return {
			query,
			matches: results.slice(0, 20),
			totalFound: results.length,
		};
	},
});

async function searchDirectory(
	obsidianRoot: string,
	relativeDir: string,
	lowerQuery: string,
	results: { relativePath: string; title: string; snippet: string }[],
) {
	const absoluteDir = path.join(obsidianRoot, relativeDir);
	let entries: import("node:fs").Dirent[];
	try {
		entries = await fs.readdir(absoluteDir, { withFileTypes: true });
	} catch {
		return;
	}

	for (const entry of entries) {
		if (entry.name.startsWith(".")) continue;

		const relativePath = relativeDir
			? path.posix.join(relativeDir, entry.name)
			: entry.name;

		if (entry.isDirectory()) {
			await searchDirectory(obsidianRoot, relativePath, lowerQuery, results);
			continue;
		}

		if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;

		const lowerName = entry.name.toLowerCase();
		let matched = lowerName.includes(lowerQuery);
		let snippet = "";

		if (!matched) {
			try {
				const content = await fs.readFile(
					path.join(obsidianRoot, relativePath),
					"utf8",
				);
				const lowerContent = content.toLowerCase();
				const idx = lowerContent.indexOf(lowerQuery);
				if (idx >= 0) {
					matched = true;
					const start = Math.max(0, idx - 60);
					const end = Math.min(content.length, idx + lowerQuery.length + 60);
					snippet = `…${content.slice(start, end).replace(/\n/g, " ")}…`;
				}
			} catch {
				// skip unreadable files
			}
		}

		if (matched) {
			const title = entry.name
				.replace(/\.md$/i, "")
				.replace(/[-_]+/g, " ")
				.replace(/\b\w/g, (l) => l.toUpperCase());

			results.push({ relativePath, title, snippet });
		}
	}
}
