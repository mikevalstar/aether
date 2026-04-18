import { z } from "zod";
import { modelField, validateFrontmatterAndBody } from "./shared";
import type { AiConfigValidator } from "./types";

export const subAgentFrontmatterSchema = z.object({
  name: z.string().min(1, "name is required"),
  description: z.string().min(1, "description is required"),
  model: modelField,
});

export const subAgentValidator: AiConfigValidator = {
  filename: "sub-agents/",
  label: "Sub-Agent",
  description: [
    "Markdown files in `sub-agents/` define sub-agents — focused AI helpers the parent can spawn in parallel via the `spawn_sub_agents` tool.",
    "",
    "**Required frontmatter:**",
    "- `name` — human-readable display name",
    "- `description` — when the parent should use this sub-agent (shown in the `spawn_sub_agents` tool description)",
    "",
    "**Optional frontmatter:**",
    "- `model` — model ID to use for this sub-agent. Omit to inherit the parent's model.",
    "",
    "**Body:** The sub-agent's system prompt. Must be non-empty. Remind the sub-agent that only its final assistant message is returned to the parent and that it cannot ask clarifying questions.",
  ].join("\n"),
  validate(frontmatter: Record<string, unknown>, body: string) {
    return validateFrontmatterAndBody(subAgentFrontmatterSchema, frontmatter, body, "Sub-agent body").result;
  },
};
