import { prisma } from "#/db";
import { readWorkflowPromptConfig } from "#/lib/ai-config";
import { executePrompt, resolveEffort, resolveModel } from "#/lib/executor-shared";
import type { NotificationDelivery, NotificationSeverity } from "#/lib/notify";
import { interpolatePrompt } from "#/lib/prompt-utils";

export type WorkflowField = {
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  default?: string;
};

export type WorkflowConfig = {
  title: string;
  description?: string;
  model?: string;
  effort?: string;
  maxTokens?: number;
  notification: NotificationDelivery;
  notificationLevel: NotificationSeverity;
  notifyUsers: string[];
  pushMessage: boolean;
  fields: WorkflowField[];
  body: string;
};

export async function executeWorkflow(
  filename: string,
  config: WorkflowConfig,
  formValues: Record<string, string>,
  userId: string,
): Promise<{ threadId: string; success: boolean }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found");
  }

  // Resolve model and effort
  const userTimezone = user.preferences ? (JSON.parse(user.preferences) as { timezone?: string }).timezone : undefined;

  const userVars = { userName: user.name, userEmail: user.email, timezone: userTimezone };
  const workflowPromptConfig = await readWorkflowPromptConfig(userVars);
  const model = resolveModel(config.model, workflowPromptConfig.model);
  const effort = resolveEffort(config.effort, workflowPromptConfig.effort);

  // Substitute placeholders in the workflow body, then form field values
  let workflowBody = interpolatePrompt(config.body, userVars);
  for (const field of config.fields) {
    const value = formValues[field.name]?.trim() || "not entered";
    workflowBody = workflowBody.replace(new RegExp(`\\{\\{${field.name}\\}\\}`, "g"), value);
  }

  return executePrompt({
    type: "workflow",
    filename,
    title: config.title,
    model,
    effort,
    systemPrompt: workflowPromptConfig.prompt,
    userPrompt: workflowBody,
    userId,
    userTimezone,
    maxTokens: config.maxTokens,
    notification: config.notification,
    notificationLevel: config.notificationLevel,
    notifyUsers: config.notifyUsers,
    pushMessage: config.pushMessage,
    extraMetadata: { formValues },
    onSuccessOps: ({ threadId }) => [
      prisma.workflow.update({
        where: { filename },
        data: { lastRunAt: new Date(), lastRunStatus: "success", lastThreadId: threadId },
      }),
    ],
    onErrorOps: ({ threadId }) => [
      prisma.workflow.update({
        where: { filename },
        data: { lastRunAt: new Date(), lastRunStatus: "error", lastThreadId: threadId },
      }),
    ],
  });
}
