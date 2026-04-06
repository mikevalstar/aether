import { promptOverrideFrontmatterSchema, validateFrontmatterAndBody, validEfforts, validModelIds } from "./shared";
import type { AiConfigValidator } from "./types";

export const triggerPromptValidator: AiConfigValidator = {
  filename: "trigger-prompt.md",
  label: "Trigger System Prompt",
  description: [
    "Defines the system prompt used for all event trigger executions.",
    "",
    "**Optional frontmatter:**",
    `- \`model\` — default model for triggers. One of: ${validModelIds.join(", ")} (aliases also accepted)`,
    `- \`effort\` — default effort for triggers. One of: ${validEfforts.join(", ")}`,
    "",
    "**Body:** The system prompt template. Must be non-empty.",
  ].join("\n"),
  validate(frontmatter: Record<string, unknown>, body: string) {
    return validateFrontmatterAndBody(promptOverrideFrontmatterSchema, frontmatter, body, "Trigger system prompt body")
      .result;
  },
};
