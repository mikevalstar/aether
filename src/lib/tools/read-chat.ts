import { tool } from "ai";
import { z } from "zod";
import { prisma } from "#/db";
import { type AppChatMessage, getMessageText, parseStoredMessages, threadIdToSlug } from "#/lib/chat/chat";

type SummarizedMessage = {
  role: string;
  text?: string;
  toolCalls?: string[];
};

function summarizeMessages(messages: AppChatMessage[], includeToolDetails: boolean): SummarizedMessage[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => {
      const text = getMessageText(m);
      const toolCalls: string[] = [];

      if (m.parts) {
        for (const part of m.parts) {
          if (part.type === "tool-call") {
            // Parts are stored as JSON — access fields dynamically
            const p = part as Record<string, unknown>;
            const name = (p.toolName as string) ?? "unknown";
            if (includeToolDetails) {
              toolCalls.push(`${name}(${JSON.stringify(p.args ?? {})})`);
            } else {
              toolCalls.push(name);
            }
          }
        }
      }

      const result: SummarizedMessage = { role: m.role };
      if (text) result.text = text;
      if (toolCalls.length > 0) result.toolCalls = toolCalls;
      return result;
    });
}

export function createReadChat(userId: string) {
  return tool({
    description:
      "Read the messages from a previous chat thread by its ID. Returns the conversation messages. By default, tool calls are summarized to just the tool name; set includeToolDetails to true to include full arguments.",
    inputSchema: z.object({
      threadId: z.string().describe("The thread ID to read (e.g. thread_abc123)"),
      includeToolDetails: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, include full tool call arguments. Default false (just tool names)."),
    }),
    execute: async ({ threadId, includeToolDetails }) => {
      const thread = await prisma.chatThread.findFirst({
        where: { id: threadId, userId },
      });

      if (!thread) {
        return { error: "Thread not found" };
      }

      const messages = parseStoredMessages(thread.messagesJson ?? "[]");

      return {
        threadId: thread.id,
        url: `/chat/${threadIdToSlug(thread.id)}`,
        title: thread.title,
        model: thread.model,
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.updatedAt.toISOString(),
        messageCount: messages.length,
        messages: summarizeMessages(messages, includeToolDetails),
      };
    },
  });
}
