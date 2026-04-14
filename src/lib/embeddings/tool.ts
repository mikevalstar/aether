import { tool } from "ai";
import { z } from "zod";
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
    },
  });
}
