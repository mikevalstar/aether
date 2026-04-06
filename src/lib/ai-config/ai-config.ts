import { promises as fs } from "node:fs";
import path from "node:path";
import { OBSIDIAN_AI_CONFIG, OBSIDIAN_DIR } from "#/lib/obsidian/obsidian";
import { interpolatePrompt, type PromptVars } from "#/lib/prompt-utils";
import { type AiConfigReadResult, parseAndValidateAiConfig } from "./ai-config.shared";

export type { AiConfigReadResult } from "./ai-config.shared";
export { parseAndValidateAiConfig } from "./ai-config.shared";

function getAiConfigDir(): string {
  const obsidianDir = OBSIDIAN_DIR;
  const aiConfigRel = OBSIDIAN_AI_CONFIG;

  if (!obsidianDir || !aiConfigRel) return "";

  return path.join(obsidianDir, aiConfigRel);
}

/**
 * Read and validate an AI config file from the Obsidian AI config directory.
 * Server-only — uses filesystem access.
 */
export async function readAiConfig(filename: string): Promise<AiConfigReadResult | null> {
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
export async function readSystemPrompt(vars: PromptVars): Promise<string | null> {
  const result = await readAiConfig("system-prompt.md");

  if (!result?.validation.isValid) return null;

  return interpolatePrompt(result.body, vars);
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

  if (!result?.validation.isValid) return null;

  const model = result.frontmatter.model;
  if (typeof model !== "string") return null;

  return { model, prompt: result.body };
}

const DEFAULT_TRIGGER_SYSTEM_PROMPT = `You are an autonomous AI assistant responding to an event trigger for {{userName}}. It is {{dayOfWeek}}, {{date}} at {{time}} ({{timezone}}).

You are running unattended in response to an external event. The event details are provided in the user prompt. Analyze the payload carefully before acting.

You have access to tools for reading and writing files in the user's Obsidian vault, web search, and web fetch. Use them as needed. AI memory notes are stored in the \`{{aiMemoryPath}}\` folder — check there for context about the user's preferences when relevant.

Keep output concise and actionable. Focus on what the user needs to know or what action needs to be taken.`;

const DEFAULT_WORKFLOW_SYSTEM_PROMPT = `You are an autonomous AI assistant running a user-triggered background workflow for {{userName}}. It is {{dayOfWeek}}, {{date}} at {{time}} ({{timezone}}).

You have access to tools for reading and writing files in the user's Obsidian vault, web search, and web fetch. Use them as needed to complete the workflow described in the user message.

Focus on producing the requested output. If you write files, use clear filenames and organize content logically within the vault.

AI memory notes are stored in the \`{{aiMemoryPath}}\` folder — check there for context about the user's preferences and templates if relevant.`;

const DEFAULT_TASK_SYSTEM_PROMPT = `You are an autonomous AI assistant running a scheduled background task for {{userName}}. It is {{dayOfWeek}}, {{date}} at {{time}} ({{timezone}}).

You have access to tools for reading and writing files in the user's Obsidian vault, web search, and web fetch. Use them as needed to complete the task described in the user message.

Be thorough but concise. Focus on producing useful output. If you write files, use clear filenames and organize content logically.`;

/**
 * Read the task prompt config and return model, effort, and interpolated prompt.
 * Falls back to a hardcoded default if the file is missing or invalid.
 */
export async function readTaskPromptConfig(vars: PromptVars): Promise<{ model?: string; effort?: string; prompt: string }> {
  const result = await readAiConfig("task-prompt.md");

  if (!result?.validation.isValid) {
    return {
      prompt: interpolatePrompt(DEFAULT_TASK_SYSTEM_PROMPT, vars),
    };
  }

  const model = typeof result.frontmatter.model === "string" ? result.frontmatter.model : undefined;
  const effort = typeof result.frontmatter.effort === "string" ? result.frontmatter.effort : undefined;

  return { model, effort, prompt: interpolatePrompt(result.body, vars) };
}

/**
 * Read the workflow prompt config and return model, effort, and interpolated prompt.
 * Falls back to a hardcoded default if the file is missing or invalid.
 */
export async function readWorkflowPromptConfig(
  vars: PromptVars,
): Promise<{ model?: string; effort?: string; prompt: string }> {
  const result = await readAiConfig("workflow-prompt.md");

  if (!result?.validation.isValid) {
    return {
      prompt: interpolatePrompt(DEFAULT_WORKFLOW_SYSTEM_PROMPT, vars),
    };
  }

  const model = typeof result.frontmatter.model === "string" ? result.frontmatter.model : undefined;
  const effort = typeof result.frontmatter.effort === "string" ? result.frontmatter.effort : undefined;

  return { model, effort, prompt: interpolatePrompt(result.body, vars) };
}

/**
 * Read the trigger prompt config and return model, effort, and interpolated prompt.
 * Falls back to a hardcoded default if the file is missing or invalid.
 */
export async function readTriggerPromptConfig(
  vars: PromptVars,
): Promise<{ model?: string; effort?: string; prompt: string }> {
  const result = await readAiConfig("trigger-prompt.md");

  if (!result?.validation.isValid) {
    return {
      prompt: interpolatePrompt(DEFAULT_TRIGGER_SYSTEM_PROMPT, vars),
    };
  }

  const model = typeof result.frontmatter.model === "string" ? result.frontmatter.model : undefined;
  const effort = typeof result.frontmatter.effort === "string" ? result.frontmatter.effort : undefined;

  return { model, effort, prompt: interpolatePrompt(result.body, vars) };
}
