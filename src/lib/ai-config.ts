import { promises as fs } from "node:fs";
import path from "node:path";
import {
	type AiConfigReadResult,
	parseAndValidateAiConfig,
} from "#/lib/ai-config.shared";

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

	return result.body
		.replace(/\{\{date\}\}/g, new Date().toLocaleDateString("en-CA"))
		.replace(/\{\{userName\}\}/g, userName);
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
