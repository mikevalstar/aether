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

export const triggerFrontmatterSchema = z.object({
  title: z.string().min(1, "title is required"),
  type: z.string().min(1, "type is required"),
  model: modelField,
  effort: effortField,
  enabled: z.boolean().optional(),
  maxTokens: z.number().int().positive().optional(),
  pattern: z.string().min(1).optional(),
  notification: notificationField,
  notificationLevel: notificationLevelField,
  notifyUsers: notifyUsersField,
  pushMessage: pushMessageField,
});

export const triggerValidator: AiConfigValidator = {
  filename: "triggers/",
  label: "Event Trigger",
  description: [
    "Markdown files in `triggers/` define event-driven AI triggers.",
    "",
    "**Required frontmatter:**",
    "- `title` — human-readable trigger name",
    "- `type` — event type identifier (e.g. `github`, `imap_email:new_email`)",
    "",
    "**Optional frontmatter:**",
    `- \`model\` — one of: ${validModelIds.join(", ")} (aliases also accepted)`,
    `- \`effort\` — one of: ${validEfforts.join(", ")}`,
    "- `enabled` — boolean (default true)",
    "- `maxTokens` — positive integer output token limit",
    "- `pattern` — JMESPath expression to filter events (omit to match all)",
    `- \`notification\` — delivery: one of: ${validNotificationDeliveries.join(", ")} (default: notify)`,
    `- \`notificationLevel\` — severity: one of: ${validNotificationSeverities.join(", ")} (default: info)`,
    '- `notifyUsers` — array of email addresses to notify, or ["all"] (default: all)',
    "- `pushMessage` — boolean, force push notification (default: false)",
    "",
    "**Body:** The prompt sent to the AI. Must be non-empty and contain `{{details}}`.",
  ].join("\n"),
  validate(frontmatter: Record<string, unknown>, body: string) {
    const fmResult = triggerFrontmatterSchema.safeParse(frontmatter);
    const errors = formatFrontmatterErrors(fmResult);

    if (!body || body.trim().length === 0) {
      errors.push("Trigger prompt body cannot be empty");
    } else if (!body.includes("{{details}}")) {
      errors.push("Trigger prompt body must contain the {{details}} placeholder");
    }

    return { isValid: errors.length === 0, errors };
  },
};
