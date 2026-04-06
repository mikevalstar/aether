import { prisma } from "#/db";
import { readTriggerPromptConfig } from "#/lib/ai-config/ai-config";
import { executePrompt, resolveEffort, resolveModel } from "#/lib/executor-shared";
import { logger } from "#/lib/logger";
import { getUserTimezone } from "#/lib/preferences.server";
import { interpolatePrompt } from "#/lib/prompt-utils";
import type { TriggerConfig } from "#/lib/triggers/trigger-watcher";

/**
 * Execute a trigger: load system prompt, interpolate details into body,
 * and run via the shared executePrompt() harness.
 */
export async function executeTrigger(
  filename: string,
  config: TriggerConfig,
  payload: Record<string, unknown>,
): Promise<void> {
  // Find first admin user (same as tasks)
  const adminUser = await prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true },
  });

  if (!adminUser) {
    logger.error("No admin user found for trigger execution");
    return;
  }

  const adminTimezone = await getUserTimezone(adminUser.id);
  const userVars = { userName: adminUser.name, userEmail: adminUser.email, timezone: adminTimezone };

  const triggerPromptConfig = await readTriggerPromptConfig(userVars);
  const model = resolveModel(config.model, triggerPromptConfig.model);
  const effort = resolveEffort(config.effort, triggerPromptConfig.effort);

  // Substitute {{details}} with serialized payload, then standard placeholders
  const detailsStr = JSON.stringify(payload, null, 2);
  const bodyWithDetails = config.body.replace(/\{\{details\}\}/g, detailsStr);
  const userPrompt = interpolatePrompt(bodyWithDetails, userVars);

  await executePrompt({
    type: "trigger",
    filename,
    title: config.title,
    model,
    effort,
    systemPrompt: triggerPromptConfig.prompt,
    userPrompt,
    userId: adminUser.id,
    userTimezone: adminTimezone,
    maxTokens: config.maxTokens,
    notification: config.notification as "silent" | "notify" | "push",
    notificationLevel: config.notificationLevel as "info" | "low" | "medium" | "high" | "critical",
    notifyUsers: config.notifyUsers,
    pushMessage: config.pushMessage,
    extraMetadata: { source: config.type, pattern: config.pattern },
    onSuccessOps: ({ threadId }) => [
      prisma.trigger.update({
        where: { filename },
        data: { lastFiredAt: new Date(), lastRunStatus: "success", lastThreadId: threadId },
      }),
    ],
    onErrorOps: ({ threadId }) => [
      prisma.trigger.update({
        where: { filename },
        data: { lastFiredAt: new Date(), lastRunStatus: "error", lastThreadId: threadId },
      }),
    ],
  });
}
