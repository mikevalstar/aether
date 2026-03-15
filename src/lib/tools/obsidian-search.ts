import { tool } from "ai";
import { z } from "zod";
import { searchVault } from "#/lib/obsidian/vault-index";

/**
 * Obsidian vault search tool — exposed to the AI chat as `obsidian_search`.
 *
 * Uses an in-memory fuse.js index (built at server startup via chokidar)
 * to perform fuzzy search across note metadata and content. The index is
 * kept up-to-date via file watching, so no filesystem I/O happens per query.
 *
 * Search fields (by weight):
 *   title (1.0) > aliases (0.8) > tags (0.7) > headings (0.6) > path (0.4) > body (0.3)
 *
 * Returns up to `limit` results (default 20, configurable). Results are
 * ranked by fuse.js relevance. The `score` field is normalized to 0–100
 * where 100 is a perfect match and 0 is the weakest match returned.
 *
 * Example output:
 * {
 *   query: "weekly review",
 *   matches: [
 *     {
 *       relativePath: "Journal/Weekly Review Template.md",
 *       title: "Weekly Review Template",
 *       tags: ["weekly", "review", "planning"],
 *       aliases: ["weekly checkin"],
 *       headings: ["What went well", "What needs improvement", "Next week goals"],
 *       folder: "Journal",
 *       score: 92
 *     },
 *     {
 *       relativePath: "Projects/Q1 Review.md",
 *       title: "Q1 Review",
 *       tags: ["review", "quarterly"],
 *       aliases: [],
 *       headings: ["Summary", "Key metrics", "Action items"],
 *       folder: "Projects",
 *       score: 61
 *     }
 *   ],
 *   totalFound: 2
 * }
 */
export const obsidianSearch = tool({
	description:
		"Search the user's Obsidian vault for notes matching a query. Uses fuzzy matching across titles, tags, aliases, headings, and content. Returns ranked results with relevance scores.",
	inputSchema: z.object({
		query: z
			.string()
			.describe(
				"Search term to match against note titles, tags, aliases, headings, and content",
			),
		limit: z
			.number()
			.optional()
			.default(20)
			.describe("Maximum number of results to return (default 20)"),
	}),
	execute: async ({ query, limit }) => {
		const obsidianRoot = process.env.OBSIDIAN_DIR ?? "";
		if (!obsidianRoot) {
			return { error: "Obsidian vault is not configured." };
		}

		const results = await searchVault(query, limit);

		if (results.length === 0) {
			return {
				query,
				matches: [],
				message: "No notes found matching the query.",
			};
		}

		return {
			query,
			matches: results.map((r) => ({
				relativePath: r.item.relativePath,
				title: r.item.title,
				tags: r.item.tags,
				aliases: r.item.aliases,
				headings: r.item.headings,
				folder: r.item.folder,
				score: Math.round((1 - r.score) * 100), // 100 = perfect match, 0 = worst
			})),
			totalFound: results.length,
		};
	},
});
