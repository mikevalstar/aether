import type { AiConfigValidator } from "./types";
import {
  promptOverrideFrontmatterSchema,
  validateFrontmatterAndBody,
  validEfforts,
  validModelIds,
} from "./shared";

export const taskPromptValidator: AiConfigValidator = {
  filename: "task-prompt.md",
  label: "Task System Prompt",
  description: [
    "Defines the system prompt used for all periodic task executions.",
    "",
    "**Optional frontmatter:**",
    `- \`model\` — default model for tasks. One of: ${validModelIds.join(", ")} (aliases also accepted)`,
    `- \`effort\` — default effort for tasks. One of: ${validEfforts.join(", ")}`,
    "",
    "**Body:** The system prompt template. Must be non-empty.",
  ].join("\n"),
  validate(frontmatter: Record<string, unknown>, body: string) {
    return validateFrontmatterAndBody(
      promptOverrideFrontmatterSchema,
      frontmatter,
      body,
      "Task system prompt body",
    ).result;
  },
};
