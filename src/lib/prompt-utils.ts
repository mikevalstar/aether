import { formatIsoDate } from "#/lib/date";

export type PromptVars = {
  userName: string;
  userEmail?: string;
};

/**
 * Interpolate standard placeholders in a prompt template.
 *
 * Supported placeholders:
 * - `{{date}}` — today's date (YYYY-MM-DD)
 * - `{{userName}}` — the current user's display name
 * - `{{userEmail}}` — the current user's email address
 * - `{{aiMemoryPath}}` — relative path to the AI memory folder
 */
export function interpolatePrompt(template: string, vars: PromptVars): string {
  const aiMemoryPath = process.env.OBSIDIAN_AI_MEMORY ?? "ai-memory";

  return template
    .replace(/\{\{date\}\}/g, formatIsoDate(new Date()))
    .replace(/\{\{userName\}\}/g, vars.userName)
    .replace(/\{\{userEmail\}\}/g, vars.userEmail ?? "")
    .replace(/\{\{aiMemoryPath\}\}/g, aiMemoryPath);
}
