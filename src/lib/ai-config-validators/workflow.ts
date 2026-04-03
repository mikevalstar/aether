import { z } from "zod";
import type { AiConfigValidator } from "./types";
import {
  effortField,
  formatFrontmatterErrors,
  modelField,
  notificationField,
  validEfforts,
  validFieldTypes,
  validModelIds,
  validNotificationLevels,
} from "./shared";

export const workflowFieldSchema = z.object({
  name: z.string().min(1, "field name is required"),
  label: z.string().min(1, "field label is required"),
  type: z.enum(validFieldTypes).optional().default("text"),
  required: z.boolean().optional().default(true),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  default: z.string().optional(),
});

export const workflowFrontmatterSchema = z.object({
  title: z.string().min(1, "title is required"),
  description: z.string().optional(),
  model: modelField,
  effort: effortField,
  maxTokens: z.number().int().positive().optional(),
  notification: notificationField,
  fields: z.array(workflowFieldSchema).min(1, "at least one field is required"),
});

export const workflowValidator: AiConfigValidator = {
  filename: "workflows/",
  label: "Workflow",
  description: [
    "Markdown files in `workflows/` define form-based AI workflows.",
    "",
    "**Required frontmatter:**",
    "- `title` — human-readable workflow name",
    "- `fields` — array of form field definitions (name, label, type, required, placeholder, options, default)",
    "",
    "**Optional frontmatter:**",
    `- \`description\` — short description shown in the UI`,
    `- \`model\` — one of: ${validModelIds.join(", ")} (aliases also accepted)`,
    `- \`effort\` — one of: ${validEfforts.join(", ")}`,
    "- `maxTokens` — positive integer output token limit",
    `- \`notification\` — one of: ${validNotificationLevels.join(", ")} (default: notify)`,
    "",
    "**Field types:** text, textarea, url, select",
    "",
    "**Body:** The prompt template sent to the AI. Use `{{fieldName}}` placeholders. Must be non-empty.",
  ].join("\n"),
  validate(frontmatter: Record<string, unknown>, body: string) {
    const fmResult = workflowFrontmatterSchema.safeParse(frontmatter);
    const errors = formatFrontmatterErrors(fmResult);

    if (fmResult.success) {
      // Validate unique field names
      const names = fmResult.data.fields.map((f) => f.name);
      const dupes = names.filter((n, i) => names.indexOf(n) !== i);
      if (dupes.length > 0) {
        errors.push(`Frontmatter — fields: duplicate field names: ${[...new Set(dupes)].join(", ")}`);
      }

      // Validate select fields have options
      for (const field of fmResult.data.fields) {
        if (field.type === "select" && (!field.options || field.options.length === 0)) {
          errors.push(`Frontmatter — fields.${field.name}: select type requires non-empty options array`);
        }
      }

      // Validate field placeholders exist in body
      for (const field of fmResult.data.fields) {
        if (!body.includes(`{{${field.name}}}`)) {
          errors.push(`Body is missing placeholder {{${field.name}}} for field "${field.label}"`);
        }
      }
    }

    if (!body || body.trim().length === 0) {
      errors.push("Workflow prompt body cannot be empty");
    }

    return { isValid: errors.length === 0, errors };
  },
};
