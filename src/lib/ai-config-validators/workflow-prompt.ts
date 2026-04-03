import { z } from "zod";
import { CHAT_MODELS, resolveModelId } from "#/lib/chat-models";
import type { AiConfigValidator } from "./types";

const validModelIds = CHAT_MODELS.map((m) => m.id) as [string, ...string[]];
const validEfforts = ["low", "medium", "high"] as const;

const frontmatterSchema = z.object({
  model: z
    .string()
    .refine((v) => resolveModelId(v) !== undefined, "Must be a valid model ID or alias")
    .transform((v) => resolveModelId(v)!)
    .optional(),
  effort: z.enum(validEfforts).optional(),
});

export const workflowPromptValidator: AiConfigValidator = {
  filename: "workflow-prompt.md",
  label: "Workflow System Prompt",
  description: [
    "Defines the system prompt used for all workflow executions.",
    "",
    "**Optional frontmatter:**",
    `- \`model\` — default model for workflows. One of: ${validModelIds.join(", ")} (aliases also accepted)`,
    `- \`effort\` — default effort for workflows. One of: ${validEfforts.join(", ")}`,
    "",
    "**Body:** The system prompt template. Must be non-empty.",
  ].join("\n"),
  validate(frontmatter: Record<string, unknown>, body: string) {
    const errors: string[] = [];

    const fmResult = frontmatterSchema.safeParse(frontmatter);
    if (!fmResult.success) {
      for (const issue of fmResult.error.issues) {
        const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
        errors.push(`Frontmatter — ${path}${issue.message}`);
      }
    }

    if (!body || body.trim().length === 0) {
      errors.push("Workflow system prompt body cannot be empty");
    }

    return { isValid: errors.length === 0, errors };
  },
};
