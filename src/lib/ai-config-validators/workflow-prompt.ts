import type { AiConfigValidator } from "./types";
import {
  promptOverrideFrontmatterSchema,
  validateFrontmatterAndBody,
  validEfforts,
  validModelIds,
} from "./shared";

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
    return validateFrontmatterAndBody(
      promptOverrideFrontmatterSchema,
      frontmatter,
      body,
      "Workflow system prompt body",
    ).result;
  },
};
