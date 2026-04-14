import { tool } from "ai";
import { z } from "zod";
import { threadIdToSlug } from "#/lib/chat/chat";

export function createGetChatId(threadId: string) {
  return tool({
    description:
      "Get the ID and URL of the current chat thread. Use this when you need to reference, identify, or link to the current conversation.",
    inputSchema: z.object({}),
    execute: async () => {
      return { threadId, url: `/chat/${threadIdToSlug(threadId)}` };
    },
  });
}
