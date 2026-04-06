import crypto from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "#/db";
import { ensureSession } from "#/lib/auth.functions";
import { type ChatModel, DEFAULT_CHAT_MODEL, resolveModelId } from "#/lib/chat/chat-models";
import { filenameInputSchema, threadIdInputSchema } from "#/lib/shared-schemas";

export type TriggerListItem = {
  id: string;
  filename: string;
  title: string;
  type: string;
  pattern: string | null;
  model: string;
  effort: string;
  enabled: boolean;
  maxTokens: number | null;
  lastFiredAt: string | null;
  lastRunStatus: string | null;
  lastThreadId: string | null;
  fileExists: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TriggerRunItem = {
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

export const getTriggersPageData = createServerFn({ method: "GET" }).handler(async () => {
  await ensureSession();

  const triggerRows = await prisma.trigger.findMany({
    orderBy: { title: "asc" },
  });

  const items: TriggerListItem[] = triggerRows.map((row) => ({
    id: row.id,
    filename: row.filename,
    title: row.title,
    type: row.type,
    pattern: row.pattern,
    model: row.model,
    effort: row.effort,
    enabled: row.enabled,
    maxTokens: row.maxTokens,
    lastFiredAt: row.lastFiredAt?.toISOString() ?? null,
    lastRunStatus: row.lastRunStatus,
    lastThreadId: row.lastThreadId,
    fileExists: row.fileExists,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));

  return { items };
});

export const getTriggerRunHistory = createServerFn({ method: "GET" })
  .inputValidator((data) => filenameInputSchema.parse(data))
  .handler(async ({ data }) => {
    await ensureSession();

    const trigger = await prisma.trigger.findUnique({
      where: { filename: data.filename },
    });

    if (!trigger) throw new Error("Trigger not found");

    const threads = await prisma.chatThread.findMany({
      where: {
        type: "trigger",
        sourceTriggerFile: data.filename,
      },
      orderBy: { createdAt: "desc" },
    });

    const runs: TriggerRunItem[] = threads.map((t) => ({
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
      trigger: {
        filename: trigger.filename,
        title: trigger.title,
        type: trigger.type,
        pattern: trigger.pattern,
        model: trigger.model,
        effort: trigger.effort,
        enabled: trigger.enabled,
        fileExists: trigger.fileExists,
      },
      runs,
    };
  });

export const deleteTriggerRun = createServerFn({ method: "POST" })
  .inputValidator((data) => threadIdInputSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const thread = await prisma.chatThread.findFirst({
      where: {
        id: data.threadId,
        type: "trigger",
        userId: session.user.id,
      },
    });

    if (!thread) throw new Error("Not found");

    await prisma.chatThread.delete({ where: { id: data.threadId } });
    return { success: true };
  });

export const convertTriggerToChat = createServerFn({ method: "POST" })
  .inputValidator((data) => threadIdInputSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const thread = await prisma.chatThread.findFirst({
      where: {
        id: data.threadId,
        type: "trigger",
        userId: session.user.id,
      },
    });

    if (!thread) throw new Error("Not found");

    await prisma.chatThread.update({
      where: { id: data.threadId },
      data: {
        type: "chat",
        sourceTriggerFile: null,
      },
    });

    return { success: true, threadId: data.threadId };
  });

// ── Webhook Management ──────────────────────────────────────────────

export type WebhookListItem = {
  id: string;
  name: string;
  type: string;
  apiKey: string;
  lastReceivedAt: string | null;
  createdAt: string;
};

const createWebhookSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    type: z.string().trim().min(1, "Type is required"),
  })
  .strict();

const webhookIdSchema = z
  .object({
    id: z.string().trim().min(1, "ID is required"),
  })
  .strict();

export const getWebhooksPageData = createServerFn({ method: "GET" }).handler(async () => {
  const session = await ensureSession();

  const rows = await prisma.webhook.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const items: WebhookListItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    apiKey: row.apiKey,
    lastReceivedAt: row.lastReceivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));

  return { items };
});

export const createWebhook = createServerFn({ method: "POST" })
  .inputValidator((data) => createWebhookSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const apiKey = crypto.randomUUID();

    const webhook = await prisma.webhook.create({
      data: {
        name: data.name,
        type: data.type,
        apiKey,
        userId: session.user.id,
      },
    });

    return {
      id: webhook.id,
      name: webhook.name,
      type: webhook.type,
      apiKey: webhook.apiKey,
    };
  });

export const regenerateWebhookKey = createServerFn({ method: "POST" })
  .inputValidator((data) => webhookIdSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const webhook = await prisma.webhook.findFirst({
      where: { id: data.id, userId: session.user.id },
    });

    if (!webhook) throw new Error("Webhook not found");

    const newApiKey = crypto.randomUUID();

    await prisma.webhook.update({
      where: { id: data.id },
      data: { apiKey: newApiKey },
    });

    return { apiKey: newApiKey };
  });

export const deleteWebhook = createServerFn({ method: "POST" })
  .inputValidator((data) => webhookIdSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const webhook = await prisma.webhook.findFirst({
      where: { id: data.id, userId: session.user.id },
    });

    if (!webhook) throw new Error("Webhook not found");

    await prisma.webhook.delete({ where: { id: data.id } });
    return { success: true };
  });
