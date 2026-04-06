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
} from "#/lib/chat/chat";
import { CHAT_MODELS } from "#/lib/chat/chat-models";
import { logger } from "#/lib/logger";
import { type NotificationDelivery, type NotificationSeverity, notify, notifyUsers } from "#/lib/notify";

function typeLabel(type: ExecutionContext["type"]): string {
  return type === "task" ? "Task" : type === "workflow" ? "Workflow" : "Trigger";
}

export type ExecutionContext = {
  /** Execution type */
  type: "task" | "workflow" | "trigger";
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
  /** Notification delivery behavior */
  notification: NotificationDelivery;
  /** Notification severity level */
  notificationLevel: NotificationSeverity;
  /** Email addresses to notify — ["all"] for all users */
  notifyUsers: string[];
  /** Force push notification regardless of user preference */
  pushMessage: boolean;
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
      ...(ctx.type === "task"
        ? { sourceTaskFile: ctx.filename }
        : ctx.type === "workflow"
          ? { sourceWorkflowFile: ctx.filename }
          : { sourceTriggerFile: ctx.filename }),
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
          type: ctx.type === "task" ? "cron_task" : ctx.type,
          summary: `Ran ${ctx.type}: ${ctx.title}`,
          metadata: JSON.stringify({
            ...(ctx.type === "task"
              ? { taskFile: ctx.filename }
              : ctx.type === "workflow"
                ? { workflowFile: ctx.filename }
                : { triggerFile: ctx.filename }),
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
      `${typeLabel(ctx.type)} completed successfully`,
    );

    if (ctx.notification !== "silent") {
      await sendExecutionNotification(ctx, threadId, true);
    }

    return { threadId, success: true };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    logger.error({ [ctx.type]: ctx.filename, err, durationMs }, `${typeLabel(ctx.type)} execution failed`);

    await prisma.$transaction([
      prisma.chatThread.update({
        where: { id: threadId },
        data: {
          messagesJson: JSON.stringify([
            {
              id: `msg_${crypto.randomUUID()}`,
              role: "assistant",
              parts: [{ type: "text", text: `${typeLabel(ctx.type)} execution failed: ${errorMessage}` }],
            },
          ]),
        },
      }),
      prisma.activityLog.create({
        data: {
          type: ctx.type === "task" ? "cron_task" : ctx.type,
          summary: `${typeLabel(ctx.type)} failed: ${ctx.title}`,
          metadata: JSON.stringify({
            ...(ctx.type === "task"
              ? { taskFile: ctx.filename }
              : ctx.type === "workflow"
                ? { workflowFile: ctx.filename }
                : { triggerFile: ctx.filename }),
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
      await sendExecutionNotification(ctx, threadId, false, errorMessage);
    }

    return { threadId, success: false };
  }
}

/**
 * Send notification for task/workflow execution, respecting targeting and severity settings.
 */
async function sendExecutionNotification(
  ctx: ExecutionContext,
  threadId: string,
  success: boolean,
  errorMessage?: string,
): Promise<void> {
  const label = typeLabel(ctx.type);
  const title = success ? `${label} completed: ${ctx.title}` : `${label} failed: ${ctx.title}`;
  const level = success ? ctx.notificationLevel : "error";
  const category = ctx.type;
  const source = ctx.filename;
  const forcePush = !success || ctx.pushMessage || ctx.notification === "push";

  // Link to the specific run page with the run highlighted
  const basePath = ctx.type === "task" ? "/tasks" : ctx.type === "workflow" ? "/workflows" : "/triggers";
  const link = `${basePath}/${encodeURIComponent(ctx.filename)}?highlight=${encodeURIComponent(threadId)}`;

  const notificationParams = {
    title,
    body: errorMessage,
    link,
    level,
    category,
    source,
    pushToPhone: forcePush,
  };

  // Send to targeted users
  if (ctx.notifyUsers.length === 1 && ctx.notifyUsers[0] === "all") {
    // For "all" — use notifyUsers helper
    await notifyUsers({ ...notificationParams, emails: ["all"] });
  } else if (ctx.notifyUsers.length > 0) {
    // Specific users by email
    await notifyUsers({ ...notificationParams, emails: ctx.notifyUsers });
  } else {
    // Fallback: notify the executing user
    await notify({ ...notificationParams, userId: ctx.userId });
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
