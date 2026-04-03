import { promises as fs } from "node:fs";
import path from "node:path";
import { createServerFn } from "@tanstack/react-start";
import { prisma } from "#/db";
import { ensureAppRuntimeStarted } from "#/lib/app-runtime";
import { ensureSession } from "#/lib/auth.functions";
import { type ChatModel, DEFAULT_CHAT_MODEL, resolveModelId } from "#/lib/chat-models";
import { logger } from "#/lib/logger";
import { filenameInputSchema, threadIdInputSchema } from "#/lib/shared-schemas";
import { getScheduledTasks, triggerTask as schedulerTriggerTask } from "#/lib/task-scheduler";
import { getTasksDir } from "#/lib/task-scheduler/task-loader";

export type TaskListItem = {
  id: string;
  filename: string;
  title: string;
  cron: string;
  model: string;
  effort: string;
  enabled: boolean;
  endDate: string | null;
  maxTokens: number | null;
  timezone: string | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastThreadId: string | null;
  fileExists: boolean;
  nextRun: string | null;
  isBusy: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TaskRunItem = {
  id: string;
  title: string;
  type: string;
  model: ChatModel;
  effort: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCostUsd: number;
  createdAt: string;
  updatedAt: string;
  messagesJson: string;
  systemPromptJson: string | null;
  availableToolsJson: string | null;
};

export const getTasksPageData = createServerFn({ method: "GET" }).handler(async () => {
  await ensureAppRuntimeStarted();
  await ensureSession();

  // Reconcile: check if any "file removed" tasks actually have their files back
  await reconcileMissingTasks();

  const taskRows = await prisma.task.findMany({
    orderBy: { title: "asc" },
  });

  const scheduledTasks = getScheduledTasks();
  const scheduledByFilename = new Map(scheduledTasks.map((t) => [t.filename, t]));

  const cronDisabled = process.env.DISABLE_CRON === "true";
  const tasksDisabled = cronDisabled || process.env.DISABLE_TASKS === "true";

  const items: TaskListItem[] = taskRows.map((row) => {
    const scheduled = scheduledByFilename.get(row.filename);
    return {
      id: row.id,
      filename: row.filename,
      title: row.title,
      cron: row.cron,
      model: row.model,
      effort: row.effort,
      enabled: row.enabled,
      endDate: row.endDate?.toISOString() ?? null,
      maxTokens: row.maxTokens,
      timezone: row.timezone ?? null,
      lastRunAt: row.lastRunAt?.toISOString() ?? null,
      lastRunStatus: row.lastRunStatus,
      lastThreadId: row.lastThreadId,
      fileExists: row.fileExists,
      nextRun: scheduled?.nextRun?.toISOString() ?? null,
      isBusy: scheduled?.isBusy ?? false,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  });

  return { items, cronDisabled, tasksDisabled };
});

export const getTaskRunHistory = createServerFn({ method: "GET" })
  .inputValidator((data) => filenameInputSchema.parse(data))
  .handler(async ({ data }) => {
    await ensureSession();

    // Reconcile this specific task if marked as missing
    await reconcileMissingTasks();

    const task = await prisma.task.findUnique({
      where: { filename: data.filename },
    });

    if (!task) throw new Error("Task not found");

    const threads = await prisma.chatThread.findMany({
      where: {
        type: "task",
        sourceTaskFile: data.filename,
      },
      orderBy: { createdAt: "desc" },
    });

    const runs: TaskRunItem[] = threads.map((t) => ({
      id: t.id,
      title: t.title,
      type: t.type,
      model: resolveModelId(t.model) ?? DEFAULT_CHAT_MODEL,
      effort: t.effort,
      totalInputTokens: t.totalInputTokens,
      totalOutputTokens: t.totalOutputTokens,
      totalEstimatedCostUsd: t.totalEstimatedCostUsd,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      messagesJson: t.messagesJson,
      systemPromptJson: t.systemPromptJson,
      availableToolsJson: t.availableToolsJson,
    }));

    return {
      task: {
        filename: task.filename,
        title: task.title,
        cron: task.cron,
        model: task.model,
        effort: task.effort,
        enabled: task.enabled,
        timezone: task.timezone ?? null,
        fileExists: task.fileExists,
      },
      runs,
    };
  });

export const triggerTaskRun = createServerFn({ method: "POST" })
  .inputValidator((data) => filenameInputSchema.parse(data))
  .handler(async ({ data }) => {
    await ensureAppRuntimeStarted();
    await ensureSession();
    await schedulerTriggerTask(data.filename);
    return { success: true };
  });

export const deleteTaskRun = createServerFn({ method: "POST" })
  .inputValidator((data) => threadIdInputSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const thread = await prisma.chatThread.findFirst({
      where: {
        id: data.threadId,
        type: "task",
        userId: session.user.id,
      },
    });

    if (!thread) throw new Error("Not found");

    await prisma.chatThread.delete({ where: { id: data.threadId } });
    return { success: true };
  });

export const convertTaskToChat = createServerFn({ method: "POST" })
  .inputValidator((data) => threadIdInputSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const thread = await prisma.chatThread.findFirst({
      where: {
        id: data.threadId,
        type: "task",
        userId: session.user.id,
      },
    });

    if (!thread) throw new Error("Not found");

    await prisma.chatThread.update({
      where: { id: data.threadId },
      data: {
        type: "chat",
        sourceTaskFile: null,
      },
    });

    return { success: true, threadId: data.threadId };
  });

// ── Reconciliation ──────────────────────────────────────────────────

async function reconcileMissingTasks(): Promise<void> {
  const tasksDir = getTasksDir();
  if (!tasksDir) return;

  const missing = await prisma.task.findMany({
    where: { fileExists: false },
    select: { id: true, filename: true },
  });

  if (missing.length === 0) return;

  for (const row of missing) {
    const filePath = path.join(tasksDir, row.filename);
    try {
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        await prisma.task.update({
          where: { id: row.id },
          data: { fileExists: true },
        });
        logger.info({ task: row.filename }, "Task file restored — marking as active");
      }
    } catch {
      // File still doesn't exist, leave as-is
    }
  }
}
