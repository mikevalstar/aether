import { z } from "zod";
import type { AiConfigValidator } from "./types";

const REQUIRED_PLACEHOLDERS = ["{{date}}", "{{userName}}", "{{aiMemoryPath}}"] as const;

const bodySchema: z.ZodType<string> = z
	.string()
	.min(1, "System prompt body cannot be empty")
	.refine((body) => body.includes("{{date}}"), "Body must contain the {{date}} placeholder")
	.refine((body) => body.includes("{{userName}}"), "Body must contain the {{userName}} placeholder")
	.refine((body) => body.includes("{{aiMemoryPath}}"), "Body must contain the {{aiMemoryPath}} placeholder");

export const systemPromptValidator: AiConfigValidator = {
	filename: "system-prompt.md",
	label: "Chat System Prompt",
	description: [
		"This file defines the system prompt sent to the AI at the start of every chat.",
		"",
		"**Required placeholders in body:**",
		...REQUIRED_PLACEHOLDERS.map((p) => `- \`${p}\` — replaced at runtime`),
		"",
		"No frontmatter is required.",
	].join("\n"),
	validate(_frontmatter: Record<string, unknown>, body: string) {
		const errors: string[] = [];

		const bodyResult = bodySchema.safeParse(body);
		if (!bodyResult.success) {
			for (const issue of bodyResult.error.issues) {
				errors.push(issue.message);
			}
		}

		return { isValid: errors.length === 0, errors };
	},
};
