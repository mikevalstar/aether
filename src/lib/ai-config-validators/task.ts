import { Cron } from "croner";
import { z } from "zod";
import {
  effortField,
  formatFrontmatterErrors,
  modelField,
  notificationField,
  notificationLevelField,
  notifyUsersField,
  pushMessageField,
  validEfforts,
  validModelIds,
  validNotificationDeliveries,
  validNotificationSeverities,
} from "./shared";
import type { AiConfigValidator } from "./types";

export const taskFrontmatterSchema = z.object({
  title: z.string().min(1, "title is required"),
  cron: z.string().min(1, "cron expression is required"),
  model: modelField,
  effort: effortField,
  enabled: z.boolean().optional(),
  endDate: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
  timezone: z
    .string()
    .refine((val) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: val });
        return true;
      } catch {
        return false;
      }
    }, "Must be a valid IANA timezone (e.g. America/Toronto)")
    .optional(),
  notification: notificationField,
  notificationLevel: notificationLevelField,
  notifyUsers: notifyUsersField,
  pushMessage: pushMessageField,
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
    `- \`model\` — one of: ${validModelIds.join(", ")} (aliases also accepted)`,
    `- \`effort\` — one of: ${validEfforts.join(", ")}`,
    "- `enabled` — boolean (default true)",
    "- `endDate` — ISO 8601 date after which the task stops",
    "- `maxTokens` — positive integer output token limit",
    "- `timezone` — IANA timezone (e.g. America/Toronto). Defaults to server timezone",
    `- \`notification\` — delivery: one of: ${validNotificationDeliveries.join(", ")} (default: notify)`,
    `- \`notificationLevel\` — severity: one of: ${validNotificationSeverities.join(", ")} (default: info)`,
    '- `notifyUsers` — array of email addresses to notify, or ["all"] (default: all)',
    "- `pushMessage` — boolean, force push notification (default: false)",
    "",
    "**Body:** The prompt sent to the AI. Must be non-empty.",
  ].join("\n"),
  validate(frontmatter: Record<string, unknown>, body: string) {
    const fmResult = taskFrontmatterSchema.safeParse(frontmatter);
    const errors = formatFrontmatterErrors(fmResult);

    if (fmResult.success) {
      if (!isValidCron(fmResult.data.cron)) {
        errors.push("Frontmatter — cron: Invalid cron expression. Use 5-field format: min hour dom mon dow");
      }
      if (fmResult.data.endDate) {
        const d = new Date(fmResult.data.endDate);
        if (Number.isNaN(d.getTime())) {
          errors.push("Frontmatter — endDate: Must be a valid ISO 8601 date string");
        }
      }
    }

    if (!body || body.trim().length === 0) {
      errors.push("Task prompt body cannot be empty");
    }

    return { isValid: errors.length === 0, errors };
  },
};
