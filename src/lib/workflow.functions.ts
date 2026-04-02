import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "#/db";
import { ensureAppRuntimeStarted } from "#/lib/app-runtime";
import { ensureSession } from "#/lib/auth.functions";
import { type ChatModel, DEFAULT_CHAT_MODEL, resolveModelId } from "#/lib/chat-models";
import { toObsidianRoutePath } from "#/lib/obsidian";
import type { WorkflowField } from "#/lib/workflow-executor";
import { executeWorkflow } from "#/lib/workflow-executor";
import { getWorkflowConfig } from "#/lib/workflow-watcher";

const filenameInputSchema = z.object({
  filename: z.string().trim().min(1, "Filename is required"),
});

const threadIdInputSchema = z.object({
  threadId: z.string().trim().min(1, "Thread ID is required"),
});

const workflowRunInputSchema = z.object({
  filename: z.string().trim().min(1, "Filename is required"),
  formValues: z.record(z.string(), z.string()),
});

export type WorkflowListItem = {
  id: string;
  filename: string;
  title: string;
  description: string | null;
  model: string;
  effort: string;
  maxTokens: number | null;
  fields: WorkflowField[];
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastThreadId: string | null;
  fileExists: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowRunItem = {
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

export const getWorkflowsPageData = createServerFn({ method: "GET" }).handler(async () => {
  await ensureSession();

  const rows = await prisma.workflow.findMany({
    orderBy: { title: "asc" },
  });

  const items: WorkflowListItem[] = rows.map((row) => {
    let fields: WorkflowField[] = [];
    try {
      fields = JSON.parse(row.fieldsJson);
    } catch {
      // ignore
    }

    return {
      id: row.id,
      filename: row.filename,
      title: row.title,
      description: row.description,
      model: row.model,
      effort: row.effort,
      maxTokens: row.maxTokens,
      fields,
      lastRunAt: row.lastRunAt?.toISOString() ?? null,
      lastRunStatus: row.lastRunStatus,
      lastThreadId: row.lastThreadId,
      fileExists: row.fileExists,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  });

  return { items };
});

export const getWorkflowDetail = createServerFn({ method: "GET" })
  .inputValidator((data) => filenameInputSchema.parse(data))
  .handler(async ({ data }) => {
    await ensureSession();

    const workflow = await prisma.workflow.findUnique({
      where: { filename: data.filename },
    });

    if (!workflow) throw new Error("Workflow not found");

    let fields: WorkflowField[] = [];
    try {
      fields = JSON.parse(workflow.fieldsJson);
    } catch {
      // ignore
    }

    const threads = await prisma.chatThread.findMany({
      where: {
        type: "workflow",
        sourceWorkflowFile: data.filename,
      },
      orderBy: { createdAt: "desc" },
    });

    const runs: WorkflowRunItem[] = threads.map((t) => ({
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

    const aiConfigRel = process.env.OBSIDIAN_AI_CONFIG ?? "";
    const obsidianRelPath = aiConfigRel ? `${aiConfigRel}/workflows/${workflow.filename}` : "";
    const obsidianRoutePath = obsidianRelPath ? toObsidianRoutePath(obsidianRelPath) : null;

    return {
      workflow: {
        filename: workflow.filename,
        title: workflow.title,
        description: workflow.description,
        model: workflow.model,
        effort: workflow.effort,
        maxTokens: workflow.maxTokens,
        fields,
        fileExists: workflow.fileExists,
        obsidianRoutePath,
      },
      runs,
    };
  });

export const runWorkflow = createServerFn({ method: "POST" })
  .inputValidator((data) => workflowRunInputSchema.parse(data))
  .handler(async ({ data }) => {
    await ensureAppRuntimeStarted();
    const session = await ensureSession();

    const config = getWorkflowConfig(data.filename);
    if (!config) throw new Error("Workflow not found or file missing");

    // Validate required fields
    for (const field of config.fields) {
      if (field.required && !data.formValues[field.name]?.trim()) {
        throw new Error(`Field "${field.label}" is required`);
      }
    }

    // Execute in background — don't await
    void executeWorkflow(data.filename, config, data.formValues, session.user.id);

    return { success: true };
  });

export const deleteWorkflowRun = createServerFn({ method: "POST" })
  .inputValidator((data) => threadIdInputSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const thread = await prisma.chatThread.findFirst({
      where: {
        id: data.threadId,
        type: "workflow",
        userId: session.user.id,
      },
    });

    if (!thread) throw new Error("Not found");

    await prisma.chatThread.delete({ where: { id: data.threadId } });
    return { success: true };
  });

export const convertWorkflowToChat = createServerFn({ method: "POST" })
  .inputValidator((data) => threadIdInputSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const thread = await prisma.chatThread.findFirst({
      where: {
        id: data.threadId,
        type: "workflow",
        userId: session.user.id,
      },
    });

    if (!thread) throw new Error("Not found");

    await prisma.chatThread.update({
      where: { id: data.threadId },
      data: {
        type: "chat",
        sourceWorkflowFile: null,
      },
    });

    return { success: true, threadId: data.threadId };
  });
