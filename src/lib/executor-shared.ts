import { generateText, stepCountIs } from "ai";
import { prisma } from "#/db";
import { createAiTools, getModel } from "#/lib/ai-tools";
import {
  type ChatModel,
  DEFAULT_CHAT_EFFORT,
  DEFAULT_CHAT_MODEL,
  estimateChatUsageCostUsd,
  isChatEffort,
  resolveModelId,
  serializeUsageHistory,
  usageTotalsFromLanguageModelUsage,
} from "#/lib/chat";
import { CHAT_MODELS } from "#/lib/chat-models";
import { logger } from "#/lib/logger";
import { type NotificationLevel, notify } from "#/lib/notify";

export type ExecutionContext = {
  /** "task" or "workflow" */
  type: "task" | "workflow";
  /** The source filename (e.g. "tasks/daily-summary.md") */
  filename: string;
  /** Display title */
  title: string;
  /** Resolved model ID */
  model: ChatModel;
  /** Resolved effort level */
  effort: string;
  /** The system prompt to use */
  systemPrompt: string;
  /** The user prompt (already interpolated) */
  userPrompt: string;
  /** User ID for thread ownership */
  userId: string;
  /** User timezone for tools */
  userTimezone?: string;
  /** Max output tokens */
  maxTokens?: number;
  /** Notification level */
  notification: NotificationLevel;
  /** Link for notifications (e.g. "/tasks" or "/workflows") */
  notificationLink: string;
  /** Extra metadata to include in the activity log */
  extraMetadata?: Record<string, unknown>;
  /** Extra Prisma operations to run in the success transaction */
  // biome-ignore lint: Prisma client return types vary per model
  onSuccessOps?: (ctx: { threadId: string; durationMs: number }) => any[];
  /** Extra Prisma operations to run in the error transaction */
  // biome-ignore lint: Prisma client return types vary per model
  onErrorOps?: (ctx: { threadId: string; durationMs: number }) => any[];
};

/**
 * Execute a prompt-based AI operation (task or workflow) with standard
 * thread creation, usage tracking, activity logging, and notifications.
 */
export async function executePrompt(ctx: ExecutionContext): Promise<{ threadId: string; success: boolean }> {
  const startTime = Date.now();
  const modelDef = CHAT_MODELS.find((m) => m.id === ctx.model);

  // Create ChatThread for this run
  const threadId = `thread_${crypto.randomUUID()}`;
  await prisma.chatThread.create({
    data: {
      id: threadId,
      type: ctx.type,
      title: ctx.title,
      model: ctx.model,
      effort: ctx.effort,
      ...(ctx.type === "task" ? { sourceTaskFile: ctx.filename } : { sourceWorkflowFile: ctx.filename }),
      userId: ctx.userId,
    },
  });

  const tools = createAiTools(ctx.model, ctx.userId, threadId, ctx.userTimezone);
  const toolNames = Object.keys(tools);

  try {
    const result = await generateText({
      model: getModel(ctx.model),
      system: ctx.systemPrompt,
      prompt: ctx.userPrompt,
      tools,
      stopWhen: stepCountIs(20),
      ...(ctx.maxTokens ? { maxTokens: ctx.maxTokens } : {}),
      providerOptions: {
        anthropic: {
          cacheControl: { type: "ephemeral" as const },
          ...(modelDef?.supportsEffort && { effort: ctx.effort }),
        },
      },
    });

    const messagesJson = JSON.stringify(result.response.messages);
    const usage = usageTotalsFromLanguageModelUsage(result.usage);
    const estimatedCost = estimateChatUsageCostUsd(ctx.model, usage);

    const usageEntry = {
      id: `usage_${crypto.randomUUID()}`,
      model: ctx.model,
      taskType: ctx.type,
      createdAt: new Date().toISOString(),
      ...usage,
      estimatedCostUsd: estimatedCost,
      cumulativeInputTokens: usage.inputTokens,
      cumulativeOutputTokens: usage.outputTokens,
      cumulativeTotalTokens: usage.totalTokens,
      cumulativeEstimatedCostUsd: estimatedCost,
    };

    const durationMs = Date.now() - startTime;

    await prisma.$transaction([
      prisma.chatThread.update({
        where: { id: threadId },
        data: {
          messagesJson,
          usageHistoryJson: serializeUsageHistory([usageEntry]),
          totalInputTokens: usage.inputTokens,
          totalOutputTokens: usage.outputTokens,
          totalEstimatedCostUsd: estimatedCost,
          systemPromptJson: JSON.stringify(ctx.systemPrompt),
          availableToolsJson: JSON.stringify(toolNames),
        },
      }),
      prisma.chatUsageEvent.create({
        data: {
          id: `usage_event_${crypto.randomUUID()}`,
          userId: ctx.userId,
          threadId,
          model: ctx.model,
          taskType: ctx.type,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          estimatedCostUsd: estimatedCost,
        },
      }),
      prisma.activityLog.create({
        data: {
          type: ctx.type === "task" ? "cron_task" : "workflow",
          summary: `Ran ${ctx.type}: ${ctx.title}`,
          metadata: JSON.stringify({
            ...(ctx.type === "task" ? { taskFile: ctx.filename } : { workflowFile: ctx.filename }),
            chatThreadId: threadId,
            model: ctx.model,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            estimatedCostUsd: estimatedCost,
            durationMs,
            success: true,
            ...ctx.extraMetadata,
          }),
          userId: ctx.userId,
        },
      }),
      ...(ctx.onSuccessOps?.({ threadId, durationMs }) ?? []),
    ]);

    logger.info(
      {
        [ctx.type]: ctx.filename,
        threadId,
        model: ctx.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUsd: estimatedCost,
        durationMs,
      },
      `${ctx.type === "task" ? "Task" : "Workflow"} completed successfully`,
    );

    if (ctx.notification !== "silent") {
      await notify({
        userId: ctx.userId,
        title: `${ctx.type === "task" ? "Task" : "Workflow"} completed: ${ctx.title}`,
        link: ctx.notificationLink,
        pushToPhone: ctx.notification === "push",
      });
    }

    return { threadId, success: true };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    logger.error(
      { [ctx.type]: ctx.filename, err, durationMs },
      `${ctx.type === "task" ? "Task" : "Workflow"} execution failed`,
    );

    await prisma.$transaction([
      prisma.chatThread.update({
        where: { id: threadId },
        data: {
          messagesJson: JSON.stringify([
            {
              id: `msg_${crypto.randomUUID()}`,
              role: "assistant",
              parts: [
                { type: "text", text: `${ctx.type === "task" ? "Task" : "Workflow"} execution failed: ${errorMessage}` },
              ],
            },
          ]),
        },
      }),
      prisma.activityLog.create({
        data: {
          type: ctx.type === "task" ? "cron_task" : "workflow",
          summary: `${ctx.type === "task" ? "Task" : "Workflow"} failed: ${ctx.title}`,
          metadata: JSON.stringify({
            ...(ctx.type === "task" ? { taskFile: ctx.filename } : { workflowFile: ctx.filename }),
            chatThreadId: threadId,
            error: errorMessage,
            durationMs,
            success: false,
            ...ctx.extraMetadata,
          }),
          userId: ctx.userId,
        },
      }),
      ...(ctx.onErrorOps?.({ threadId, durationMs }) ?? []),
    ]);

    if (ctx.notification !== "silent") {
      await notify({
        userId: ctx.userId,
        title: `${ctx.type === "task" ? "Task" : "Workflow"} failed: ${ctx.title}`,
        body: errorMessage,
        link: ctx.notificationLink,
        pushToPhone: true,
      });
    }

    return { threadId, success: false };
  }
}

/**
 * Resolve a model ID from config overrides, falling back to the default.
 */
export function resolveModel(primary?: string, fallback?: string): ChatModel {
  if (primary) {
    const r = resolveModelId(primary);
    if (r) return r;
  }
  if (fallback) {
    const r = resolveModelId(fallback);
    if (r) return r;
  }
  return DEFAULT_CHAT_MODEL;
}

/**
 * Resolve an effort level from config overrides, falling back to the default.
 */
export function resolveEffort(primary?: string, fallback?: string): string {
  if (primary && isChatEffort(primary)) return primary;
  if (fallback && isChatEffort(fallback)) return fallback;
  return DEFAULT_CHAT_EFFORT;
}
