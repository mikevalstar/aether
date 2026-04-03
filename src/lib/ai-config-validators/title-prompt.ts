import { z } from "zod";
import type { AiConfigValidator } from "./types";
import { formatFrontmatterErrors, validModelIds } from "./shared";

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
    const frontmatterResult = frontmatterSchema.safeParse(frontmatter);
    const errors = formatFrontmatterErrors(frontmatterResult);

    const bodyResult = bodySchema.safeParse(body);
    if (!bodyResult.success) {
      for (const issue of bodyResult.error.issues) {
        errors.push(issue.message);
      }
    }

    return { isValid: errors.length === 0, errors };
  },
};
