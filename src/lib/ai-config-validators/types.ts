export type AiConfigValidationResult = {
	isValid: boolean;
	errors: string[];
};

export type AiConfigValidator = {
	/** The expected filename in the AI config directory */
	filename: string;
	/** Human-readable label for the config type */
	label: string;
	/** Human-readable description of validation requirements (markdown) */
	description: string;
	/** Validate parsed frontmatter and body content */
	validate(
		frontmatter: Record<string, unknown>,
		body: string,
	): AiConfigValidationResult;
};
