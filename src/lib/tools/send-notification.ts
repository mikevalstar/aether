import { tool } from "ai";
import { z } from "zod";
import { prisma } from "#/db";
import { notify } from "#/lib/notify";

export function createSendNotification(userId: string) {
  return tool({
    description:
      "Send a notification to the user. Use this only when the user explicitly asks to be notified or reminded about something, or when you encounter something genuinely important that warrants their attention. Do not use this for routine messages — prefer responding in the conversation instead. Set pushToPhone to true only for urgent matters or when the user specifically requests a phone notification.",
    inputSchema: z.object({
      title: z.string().describe("Short notification title"),
      body: z.string().optional().describe("Optional longer description"),
      link: z.string().optional().describe("Optional relative app URL to link to (e.g. /chat, /tasks)"),
      pushToPhone: z
        .boolean()
        .default(false)
        .describe("Whether to also send as a push notification to the user's phone. Only for urgent matters."),
    }),
    execute: async ({ title, body, link, pushToPhone }) => {
      await notify({ userId, title, body, link, pushToPhone });

      await prisma.activityLog.create({
        data: {
          type: "ai_notification",
          summary: `AI sent notification: ${title}`,
          metadata: JSON.stringify({ title, body, link, pushToPhone }),
          userId,
        },
      });

      return { sent: true, title, pushToPhone };
    },
  });
}
