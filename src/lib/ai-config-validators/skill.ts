import { z } from "zod";
import type { AiConfigValidator } from "./types";

export const skillFrontmatterSchema = z.object({
  name: z.string().min(1, "name is required"),
  description: z.string().min(1, "description is required"),
  tags: z.array(z.string()).optional(),
  priority: z.number().int().optional(),
});

export const skillValidator: AiConfigValidator = {
  filename: "skills/",
  label: "Skill",
  description: [
    "Markdown files in `skills/` define AI skills — specialized instructions the AI can load on demand.",
    "",
    "**Required frontmatter:**",
    "- `name` — human-readable display name",
    "- `description` — when to use this skill (critical for AI triggering)",
    "",
    "**Optional frontmatter:**",
    "- `tags` — array of strings for categorization",
    "- `priority` — integer controlling ordering in the skills list (higher = listed first, default: 0)",
    "",
    "**Body:** Instructions for the AI. Must be non-empty.",
  ].join("\n"),
  validate(frontmatter: Record<string, unknown>, body: string) {
    const errors: string[] = [];

    const fmResult = skillFrontmatterSchema.safeParse(frontmatter);
    if (!fmResult.success) {
      for (const issue of fmResult.error.issues) {
        const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
        errors.push(`Frontmatter — ${path}${issue.message}`);
      }
    }

    if (!body || body.trim().length === 0) {
      errors.push("Skill body cannot be empty");
    }

    return { isValid: errors.length === 0, errors };
  },
};
