import { formatIsoDate } from "#/lib/date";

export type PromptVars = {
  userName: string;
  userEmail?: string;
  timezone?: string;
};

/**
 * Interpolate standard placeholders in a prompt template.
 *
 * Supported placeholders:
 * - `{{date}}` — today's date (YYYY-MM-DD) in the user's timezone
 * - `{{time}}` — current time (e.g., "2:35 PM") in the user's timezone
 * - `{{dayOfWeek}}` — current day of the week (e.g., "Thursday")
 * - `{{timezone}}` — the user's IANA timezone (e.g., "America/Toronto")
 * - `{{userName}}` — the current user's display name
 * - `{{userEmail}}` — the current user's email address
 * - `{{aiMemoryPath}}` — relative path to the AI memory folder
 */
export function interpolatePrompt(template: string, vars: PromptVars): string {
  const aiMemoryPath = process.env.OBSIDIAN_AI_MEMORY ?? "ai-memory";
  const tz = vars.timezone || process.env.DEFAULT_TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();

  // Format date in user's timezone
  const dateStr = formatIsoDate(now, tz);

  // Format time in user's timezone (e.g., "2:35 PM")
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  });

  // Format day of week in user's timezone (e.g., "Thursday")
  const dayOfWeekStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: tz,
  });

  return template
    .replace(/\{\{date\}\}/g, dateStr)
    .replace(/\{\{time\}\}/g, timeStr)
    .replace(/\{\{dayOfWeek\}\}/g, dayOfWeekStr)
    .replace(/\{\{timezone\}\}/g, tz)
    .replace(/\{\{userName\}\}/g, vars.userName)
    .replace(/\{\{userEmail\}\}/g, vars.userEmail ?? "")
    .replace(/\{\{aiMemoryPath\}\}/g, aiMemoryPath);
}
