import matter from "gray-matter";
import { type AiConfigValidationResult, type AiConfigValidator, getValidatorForFile } from "#/lib/ai-config-validators";

export type AiConfigReadResult = {
  frontmatter: Record<string, unknown>;
  body: string;
  rawContent: string;
  validation: AiConfigValidationResult;
  validator: AiConfigValidator | undefined;
};

/**
 * Parse raw content and validate it against the matching validator.
 * Safe to use in both server and client contexts.
 */
export function parseAndValidateAiConfig(filename: string, rawContent: string): AiConfigReadResult {
  const parsed = matter(rawContent);
  const frontmatter = (parsed.data ?? {}) as Record<string, unknown>;
  const body = parsed.content.trim();
  const validator = getValidatorForFile(filename);

  const validation: AiConfigValidationResult = validator
    ? validator.validate(frontmatter, body)
    : { isValid: true, errors: [] };

  return { frontmatter, body, rawContent, validation, validator };
}
