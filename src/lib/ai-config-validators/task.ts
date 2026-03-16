import { Cron } from "croner";
import { z } from "zod";
import { CHAT_MODELS } from "#/lib/chat-models";
import type { AiConfigValidator } from "./types";

const validModelIds = CHAT_MODELS.map((m) => m.id) as [string, ...string[]];
const validEfforts = ["low", "medium", "high"] as const;

const frontmatterSchema = z.object({
	title: z.string().min(1, "title is required"),
	cron: z.string().min(1, "cron expression is required"),
	model: z.enum(validModelIds).optional(),
	effort: z.enum(validEfforts).optional(),
	enabled: z.boolean().optional(),
	endDate: z.string().optional(),
	maxTokens: z.number().int().positive().optional(),
});

function isValidCron(expr: string): boolean {
	try {
		new Cron(expr, { paused: true });
		return true;
	} catch {
		return false;
	}
}

export const taskValidator: AiConfigValidator = {
	filename: "tasks/",
	label: "Periodic Task",
	description: [
		"Markdown files in `tasks/` define scheduled AI tasks.",
		"",
		"**Required frontmatter:**",
		"- `title` — human-readable task name",
		"- `cron` — 5-field cron expression (min hour dom mon dow)",
		"",
		"**Optional frontmatter:**",
		`- \`model\` — one of: ${validModelIds.join(", ")}`,
		`- \`effort\` — one of: ${validEfforts.join(", ")}`,
		"- `enabled` — boolean (default true)",
		"- `endDate` — ISO 8601 date after which the task stops",
		"- `maxTokens` — positive integer output token limit",
		"",
		"**Body:** The prompt sent to the AI. Must be non-empty.",
	].join("\n"),
	validate(frontmatter: Record<string, unknown>, body: string) {
		const errors: string[] = [];

		const fmResult = frontmatterSchema.safeParse(frontmatter);
		if (!fmResult.success) {
			for (const issue of fmResult.error.issues) {
				const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
				errors.push(`Frontmatter — ${path}${issue.message}`);
			}
		} else {
			if (!isValidCron(fmResult.data.cron)) {
				errors.push(
					"Frontmatter — cron: Invalid cron expression. Use 5-field format: min hour dom mon dow",
				);
			}
			if (fmResult.data.endDate) {
				const d = new Date(fmResult.data.endDate);
				if (Number.isNaN(d.getTime())) {
					errors.push(
						"Frontmatter — endDate: Must be a valid ISO 8601 date string",
					);
				}
			}
		}

		if (!body || body.trim().length === 0) {
			errors.push("Task prompt body cannot be empty");
		}

		return { isValid: errors.length === 0, errors };
	},
};
