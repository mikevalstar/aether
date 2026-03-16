import { promises as fs } from "node:fs";
import path from "node:path";
import {
	type AiConfigReadResult,
	parseAndValidateAiConfig,
} from "#/lib/ai-config.shared";
import { formatIsoDate } from "#/lib/date";

export type { AiConfigReadResult } from "#/lib/ai-config.shared";
export { parseAndValidateAiConfig } from "#/lib/ai-config.shared";

function getAiConfigDir(): string {
	const obsidianDir = process.env.OBSIDIAN_DIR ?? "";
	const aiConfigRel = process.env.OBSIDIAN_AI_CONFIG ?? "";

	if (!obsidianDir || !aiConfigRel) return "";

	return path.join(obsidianDir, aiConfigRel);
}

/**
 * Read and validate an AI config file from the Obsidian AI config directory.
 * Server-only — uses filesystem access.
 */
export async function readAiConfig(
	filename: string,
): Promise<AiConfigReadResult | null> {
	const configDir = getAiConfigDir();
	if (!configDir) return null;

	const filePath = path.join(configDir, filename);

	let rawContent: string;
	try {
		rawContent = await fs.readFile(filePath, "utf8");
	} catch {
		return null;
	}

	return parseAndValidateAiConfig(filename, rawContent);
}

/**
 * Read the system prompt config and return the interpolated prompt.
 * Returns null if the file is missing or invalid — caller should fall back to hardcoded.
 */
export async function readSystemPrompt(
	userName: string,
): Promise<string | null> {
	const result = await readAiConfig("system-prompt.md");

	if (!result || !result.validation.isValid) return null;

	const aiMemoryPath = process.env.OBSIDIAN_AI_MEMORY ?? "ai-memory";

	return result.body
		.replace(/\{\{date\}\}/g, formatIsoDate(new Date()))
		.replace(/\{\{userName\}\}/g, userName)
		.replace(/\{\{aiMemoryPath\}\}/g, aiMemoryPath);
}

/**
 * Read the title prompt config and return the model + prompt.
 * Returns null if the file is missing or invalid — caller should fall back to hardcoded.
 */
export async function readTitlePromptConfig(): Promise<{
	model: string;
	prompt: string;
} | null> {
	const result = await readAiConfig("title-prompt.md");

	if (!result || !result.validation.isValid) return null;

	const model = result.frontmatter.model;
	if (typeof model !== "string") return null;

	return { model, prompt: result.body };
}

const DEFAULT_TASK_SYSTEM_PROMPT = `You are an autonomous AI assistant running a scheduled background task. Today's date is {{date}}.

You have access to tools for reading and writing files in the user's Obsidian vault, web search, and web fetch. Use them as needed to complete the task described in the user message.

Be thorough but concise. Focus on producing useful output. If you write files, use clear filenames and organize content logically.`;

/**
 * Read the task prompt config and return model, effort, and interpolated prompt.
 * Falls back to a hardcoded default if the file is missing or invalid.
 */
export async function readTaskPromptConfig(
	userName: string,
): Promise<{ model?: string; effort?: string; prompt: string }> {
	const result = await readAiConfig("task-prompt.md");

	const aiMemoryPath = process.env.OBSIDIAN_AI_MEMORY ?? "ai-memory";

	if (!result || !result.validation.isValid) {
		return {
			prompt: DEFAULT_TASK_SYSTEM_PROMPT.replace(
				/\{\{date\}\}/g,
				formatIsoDate(new Date()),
			)
				.replace(/\{\{userName\}\}/g, userName)
				.replace(/\{\{aiMemoryPath\}\}/g, aiMemoryPath),
		};
	}

	const model =
		typeof result.frontmatter.model === "string"
			? result.frontmatter.model
			: undefined;
	const effort =
		typeof result.frontmatter.effort === "string"
			? result.frontmatter.effort
			: undefined;

	const prompt = result.body
		.replace(/\{\{date\}\}/g, formatIsoDate(new Date()))
		.replace(/\{\{userName\}\}/g, userName)
		.replace(/\{\{aiMemoryPath\}\}/g, aiMemoryPath);

	return { model, effort, prompt };
}
