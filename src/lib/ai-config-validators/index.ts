import { skillValidator } from "./skill";
import { systemPromptValidator } from "./system-prompt";
import { taskValidator } from "./task";
import { taskPromptValidator } from "./task-prompt";
import { titlePromptValidator } from "./title-prompt";
import type { AiConfigValidator } from "./types";
import { workflowValidator } from "./workflow";
import { workflowPromptValidator } from "./workflow-prompt";

export type { AiConfigValidationResult, AiConfigValidator } from "./types";

const validators: AiConfigValidator[] = [
  systemPromptValidator,
  titlePromptValidator,
  taskPromptValidator,
  taskValidator,
  workflowPromptValidator,
  workflowValidator,
  skillValidator,
];

const validatorsByFilename = new Map<string, AiConfigValidator>(
  validators.filter((v) => !v.filename.endsWith("/")).map((v) => [v.filename, v]),
);

/** Validators that match by directory prefix (e.g. "tasks/") */
const directoryValidators: Array<{
  prefix: string;
  validator: AiConfigValidator;
}> = validators.filter((v) => v.filename.endsWith("/")).map((v) => ({ prefix: v.filename, validator: v }));

/**
 * Look up a validator by the config file's filename (e.g. "system-prompt.md").
 * Also matches directory-based validators (e.g. "tasks/daily-summary.md" matches "tasks/").
 * Returns undefined for files that don't have a dedicated validator.
 */
export function getValidatorForFile(filename: string): AiConfigValidator | undefined {
  const exact = validatorsByFilename.get(filename);
  if (exact) return exact;

  for (const { prefix, validator } of directoryValidators) {
    if (filename.startsWith(prefix)) return validator;
  }

  return undefined;
}

/**
 * Get all registered validators.
 */
export function getAllValidators(): AiConfigValidator[] {
  return validators;
}
