import { tool } from "ai";
import { z } from "zod";
import { logger } from "#/lib/logger";
import { searchChats } from "./search";

export function createSearchChatHistory(userId: string) {
  return tool({
    description:
      "Search through previous chat conversations using semantic similarity. " +
      "Use this when the user asks about something they discussed before, wants to find a past conversation, " +
      "or when context from previous chats would be helpful. Results are ranked by relevance and recency.",
    inputSchema: z.object({
      query: z.string().describe("Natural language search query describing what to find in past chats"),
      limit: z.number().optional().default(5).describe("Maximum number of results (default 5)"),
    }),
    execute: async ({ query, limit }) => {
      logger.info({ userId, query, limit, source: "ai-tool" }, "search_chat_history tool invoked");

      try {
        const results = await searchChats(query, userId, limit);

        if (results.length === 0) {
          return { query, matches: [], message: "No similar chats found." };
        }

        return {
          query,
          matches: results.map((r) => ({
            threadId: r.threadId,
            url: r.url,
            title: r.title,
            preview: r.preview,
            score: r.score,
            updatedAt: r.updatedAt,
          })),
        };
      } catch (err) {
        logger.error({ err, userId, query }, "search_chat_history tool failed");
        // Return a structured error to the model so it can tell the user.
        return {
          query,
          matches: [],
          error: "Search failed. The embedding service may be unavailable.",
        };
      }
    },
  });
}
