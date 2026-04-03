import { z } from "zod";
import { CHAT_MODELS, resolveModelId } from "#/lib/chat-models";
import type { AiConfigValidationResult } from "./types";

export const validModelIds = CHAT_MODELS.map((m) => m.id) as [string, ...string[]];
export const validEfforts = ["low", "medium", "high"] as const;
export const validNotificationLevels = ["silent", "notify", "push"] as const;
export const validFieldTypes = ["text", "textarea", "url", "select"] as const;

/** Reusable model field — accepts model IDs and aliases, transforms to canonical ID */
export const modelField = z
  .string()
  .refine((v) => resolveModelId(v) !== undefined, "Must be a valid model ID or alias")
  .transform((v) => resolveModelId(v)!)
  .optional();

/** Reusable effort field */
export const effortField = z.enum(validEfforts).optional();

/** Reusable notification level field */
export const notificationField = z.enum(validNotificationLevels).optional();

/** Frontmatter schema for prompt-override files (task-prompt.md, workflow-prompt.md) */
export const promptOverrideFrontmatterSchema = z.object({
  model: modelField,
  effort: effortField,
});

/**
 * Format Zod validation errors into an array of human-readable strings.
 * Prefixes each message with "Frontmatter — " and the field path.
 */
export function formatFrontmatterErrors(result: { success: boolean; error?: { issues: Array<{ path: PropertyKey[]; message: string }> } }): string[] {
  if (result.success || !result.error) return [];
  return result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `Frontmatter — ${path}${issue.message}`;
  });
}

/**
 * Standard validation: parse frontmatter with a schema, check body is non-empty.
 * Returns a validation result with collected errors.
 */
export function validateFrontmatterAndBody(
  schema: z.ZodType,
  frontmatter: Record<string, unknown>,
  body: string,
  bodyLabel: string,
): { result: AiConfigValidationResult } {
  const parsed = schema.safeParse(frontmatter);
  const errors = formatFrontmatterErrors(parsed);

  if (!body || body.trim().length === 0) {
    errors.push(`${bodyLabel} cannot be empty`);
  }

  return { result: { isValid: errors.length === 0, errors } };
}
