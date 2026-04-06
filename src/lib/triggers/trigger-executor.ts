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
 *
 * If `firingUserId` is provided, the trigger runs as that user (so they get
 * their own plugin tools, preferences, etc.). Otherwise falls back to the first
 * admin user.
 */
export async function executeTrigger(
  filename: string,
  config: TriggerConfig,
  payload: Record<string, unknown>,
  firingUserId?: string,
): Promise<void> {
  // Resolve which user to run as
  const runAsUser = firingUserId
    ? await prisma.user.findUnique({
        where: { id: firingUserId },
        select: { id: true, name: true, email: true },
      })
    : await prisma.user.findFirst({
        where: { role: "admin" },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, email: true },
      });

  if (!runAsUser) {
    logger.error({ firingUserId }, "No user found for trigger execution");
    return;
  }

  const userTimezone = await getUserTimezone(runAsUser.id);
  const userVars = { userName: runAsUser.name, userEmail: runAsUser.email, timezone: userTimezone };

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
    userId: runAsUser.id,
    userTimezone,
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
