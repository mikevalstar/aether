import { prisma } from "#/db";
import { readTaskPromptConfig } from "#/lib/ai-config/ai-config";
import { executePrompt, resolveEffort, resolveModel } from "#/lib/executor-shared";
import { logger } from "#/lib/logger";
import type { NotificationDelivery, NotificationSeverity } from "#/lib/notify";
import { getUserTimezone } from "#/lib/preferences.server";
import { interpolatePrompt } from "#/lib/prompt-utils";

export type TaskConfig = {
  title: string;
  cron: string;
  model?: string;
  effort?: string;
  enabled: boolean;
  endDate?: string;
  maxTokens?: number;
  timezone?: string;
  notification: NotificationDelivery;
  notificationLevel: NotificationSeverity;
  notifyUsers: string[];
  pushMessage: boolean;
  body: string;
};

export async function executeTask(filename: string, config: TaskConfig): Promise<void> {
  // Find first admin user
  const adminUser = await prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!adminUser) {
    logger.error("No admin user found for task execution");
    return;
  }

  // Resolve model and effort
  const adminTimezone = await getUserTimezone(adminUser.id);

  const userVars = { userName: adminUser.name, userEmail: adminUser.email, timezone: adminTimezone };
  const taskPromptConfig = await readTaskPromptConfig(userVars);
  const model = resolveModel(config.model, taskPromptConfig.model);
  const effort = resolveEffort(config.effort, taskPromptConfig.effort);

  await executePrompt({
    type: "task",
    filename,
    title: config.title,
    model,
    effort,
    systemPrompt: taskPromptConfig.prompt,
    userPrompt: interpolatePrompt(config.body, userVars),
    userId: adminUser.id,
    userTimezone: adminTimezone,
    maxTokens: config.maxTokens,
    notification: config.notification,
    notificationLevel: config.notificationLevel,
    notifyUsers: config.notifyUsers,
    pushMessage: config.pushMessage,
    onSuccessOps: ({ threadId }) => [
      prisma.task.update({
        where: { filename },
        data: { lastRunAt: new Date(), lastRunStatus: "success", lastThreadId: threadId },
      }),
    ],
    onErrorOps: ({ threadId }) => [
      prisma.task.update({
        where: { filename },
        data: { lastRunAt: new Date(), lastRunStatus: "error", lastThreadId: threadId },
      }),
    ],
  });
}
