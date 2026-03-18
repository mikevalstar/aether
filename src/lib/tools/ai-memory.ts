import { tool } from "ai";
import { z } from "zod";
import { searchAiMemoryNotes } from "#/lib/tools/obsidian-ai-notes";

/**
 * AI Memory tool — a proactive-recall wrapper around the AI memory notes search.
 *
 * The tool description strongly instructs the AI to call this at the start of
 * every conversation and whenever prior context might be relevant. This is the
 * primary mechanism to get the AI to actually use its persistent memory.
 */
export const aiMemory = tool({
	description: `Search your persistent memory for relevant context. **You MUST call this tool at the start of every conversation** to recall what you know about the user and their preferences. Also call it whenever the user mentions preferences, people, projects, past decisions, or recurring tasks — you likely already have notes about them.

Results return note metadata (path, title, tags). Use obsidian_read to read a note's full content, obsidian_write to create a new memory note, and obsidian_edit to update one. Always search before creating to avoid duplicates. Use YAML frontmatter tags for discoverability.

Memory subfolders: notes/ (preferences, people, project context), templates/ (reusable formats), tasks/ (how-to instructions), workflows/ (multi-step processes).`,
	inputSchema: z.object({
		search: z
			.string()
			.optional()
			.describe(
				"Keyword to search by title, path, or tags. Omit to list all memories.",
			),
		subfolder: z
			.string()
			.optional()
			.describe("Scope to 'notes', 'templates', 'tasks', or 'workflows'"),
	}),
	execute: async ({ search, subfolder }) => {
		return searchAiMemoryNotes({ search, subfolder });
	},
});
