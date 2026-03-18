import { z } from "zod";
import { CHAT_MODELS } from "#/lib/chat-models";
import type { AiConfigValidator } from "./types";

const validModelIds = CHAT_MODELS.map((m) => m.id) as [string, ...string[]];

const frontmatterSchema = z.object({
  model: z.enum(validModelIds, {
    message: `Must be one of: ${validModelIds.join(", ")}`,
  }),
});

const bodySchema = z.string().min(1, "Title prompt body cannot be empty");

export const titlePromptValidator: AiConfigValidator = {
  filename: "title-prompt.md",
  label: "Chat Title Prompt",
  description: [
    "This file defines the prompt used to generate chat thread titles.",
    "",
    "**Required frontmatter:**",
    `- \`model\` — the model to use for title generation. Must be one of: ${validModelIds.join(", ")}`,
    "",
    "**Body:** The prompt text sent to the model. Should instruct it to generate a short title from the user's first message.",
  ].join("\n"),
  validate(frontmatter: Record<string, unknown>, body: string) {
    const errors: string[] = [];

    const frontmatterResult = frontmatterSchema.safeParse(frontmatter);
    if (!frontmatterResult.success) {
      for (const issue of frontmatterResult.error.issues) {
        const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
        errors.push(`Frontmatter — ${path}${issue.message}`);
      }
    }

    const bodyResult = bodySchema.safeParse(body);
    if (!bodyResult.success) {
      for (const issue of bodyResult.error.issues) {
        errors.push(issue.message);
      }
    }

    return { isValid: errors.length === 0, errors };
  },
};
