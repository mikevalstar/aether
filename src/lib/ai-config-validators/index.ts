import { systemPromptValidator } from "./system-prompt";
import { titlePromptValidator } from "./title-prompt";
import type { AiConfigValidator } from "./types";

export type { AiConfigValidationResult, AiConfigValidator } from "./types";

const validators: AiConfigValidator[] = [
	systemPromptValidator,
	titlePromptValidator,
];

const validatorsByFilename = new Map<string, AiConfigValidator>(
	validators.map((v) => [v.filename, v]),
);

/**
 * Look up a validator by the config file's filename (e.g. "system-prompt.md").
 * Returns undefined for files that don't have a dedicated validator.
 */
export function getValidatorForFile(
	filename: string,
): AiConfigValidator | undefined {
	return validatorsByFilename.get(filename);
}

/**
 * Get all registered validators.
 */
export function getAllValidators(): AiConfigValidator[] {
	return validators;
}
