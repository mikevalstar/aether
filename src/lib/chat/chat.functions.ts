import { promises as fs } from "node:fs";
import path from "node:path";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "#/db";
import { logFileChange } from "#/lib/activity";
import { ensureSession } from "#/lib/auth.functions";
import {
  type AppChatMessage,
  CHAT_EFFORT_LEVELS,
  CHAT_MODELS,
  type ChatEffort,
  type ChatModel,
  type ChatThreadSummary,
  DEFAULT_CHAT_EFFORT,
  DEFAULT_CHAT_MODEL,
  getChatPreviewFromMessages,
  getMessageText,
  isChatEffort,
  parseStoredMessages,
  resolveModelId,
} from "#/lib/chat/chat";
import { logger } from "#/lib/logger";
import { OBSIDIAN_DIR } from "#/lib/obsidian/obsidian";
import { getUserPreference } from "#/lib/preferences.server";
import { threadIdInputSchema } from "#/lib/shared-schemas";

const chatModelIds = CHAT_MODELS.map((model) => model.id) as [ChatModel, ...ChatModel[]];
const chatEffortLevels = [...CHAT_EFFORT_LEVELS] as [ChatEffort, ...ChatEffort[]];

const chatThreadInputSchema = z
  .object({
    threadId: z.string().trim().optional(),
  })
  .strict();

const createChatThreadInputSchema = z
  .object({
    model: z.enum(chatModelIds).optional(),
    effort: z.enum(chatEffortLevels).optional(),
  })
  .strict();

const updateChatThreadModelInputSchema = z
  .object({
    threadId: z.string().trim().min(1, "Thread ID is required"),
    model: z.enum(chatModelIds),
  })
  .strict();

const updateChatThreadEffortInputSchema = z
  .object({
    threadId: z.string().trim().min(1, "Thread ID is required"),
    effort: z.enum(chatEffortLevels),
  })
  .strict();

const updateChatThreadTitleInputSchema = z
  .object({
    threadId: z.string().trim().min(1, "Thread ID is required"),
    title: z.string(),
  })
  .strict();

function mapThreadSummary(thread: {
  id: string;
  title: string;
  model: string;
  effort: string;
  messagesJson: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCostUsd: number;
  createdAt: Date;
  updatedAt: Date;
}): ChatThreadSummary {
  const messages = parseStoredMessages(thread.messagesJson);

  return {
    id: thread.id,
    title: thread.title,
    model: resolveModelId(thread.model) ?? DEFAULT_CHAT_MODEL,
    effort: isChatEffort(thread.effort) ? thread.effort : DEFAULT_CHAT_EFFORT,
    preview: getChatPreviewFromMessages(messages),
    totalInputTokens: thread.totalInputTokens,
    totalOutputTokens: thread.totalOutputTokens,
    totalEstimatedCostUsd: thread.totalEstimatedCostUsd,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
  };
}

export const getChatPageData = createServerFn({ method: "GET" })
  .inputValidator((data) => chatThreadInputSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const [threadRecords, defaultChatModel] = await Promise.all([
      prisma.chatThread.findMany({
        where: { userId: session.user.id, type: "chat" },
        orderBy: { updatedAt: "desc" },
        take: 500,
      }),
      getUserPreference(session.user.id, "defaultChatModel"),
    ]);

    const threads = threadRecords.map(mapThreadSummary);
    const selectedThreadRecord = data.threadId
      ? (threadRecords.find((thread) => thread.id === data.threadId) ?? null)
      : null;

    return {
      threads,
      selectedThreadId: selectedThreadRecord?.id ?? null,
      selectedThread: selectedThreadRecord ? mapThreadSummary(selectedThreadRecord) : null,
      messagesJson: selectedThreadRecord?.messagesJson ?? "[]",
      usageHistoryJson: selectedThreadRecord?.usageHistoryJson ?? "[]",
      defaultChatModel: defaultChatModel ?? DEFAULT_CHAT_MODEL,
    };
  });

export const createChatThread = createServerFn({ method: "POST" })
  .inputValidator((data) => createChatThreadInputSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();
    const model = (data.model && resolveModelId(data.model)) ?? DEFAULT_CHAT_MODEL;
    const effort = data.effort && isChatEffort(data.effort) ? data.effort : DEFAULT_CHAT_EFFORT;

    const thread = await prisma.chatThread.create({
      data: {
        id: `thread_${crypto.randomUUID()}`,
        userId: session.user.id,
        model,
        effort,
      },
    });

    return mapThreadSummary(thread);
  });

export const updateChatThreadModel = createServerFn({ method: "POST" })
  .inputValidator((data) => updateChatThreadModelInputSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const thread = await prisma.chatThread.findFirst({
      where: { id: data.threadId, userId: session.user.id },
    });

    if (!thread) {
      throw new Error("Not found");
    }

    const updatedThread = await prisma.chatThread.update({
      where: { id: data.threadId },
      data: { model: data.model },
    });

    return mapThreadSummary(updatedThread);
  });

export const updateChatThreadEffort = createServerFn({ method: "POST" })
  .inputValidator((data) => updateChatThreadEffortInputSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const thread = await prisma.chatThread.findFirst({
      where: { id: data.threadId, userId: session.user.id },
    });

    if (!thread) {
      throw new Error("Not found");
    }

    const updatedThread = await prisma.chatThread.update({
      where: { id: data.threadId },
      data: { effort: data.effort },
    });

    return mapThreadSummary(updatedThread);
  });

export const updateChatThreadTitle = createServerFn({ method: "POST" })
  .inputValidator((data) => updateChatThreadTitleInputSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const thread = await prisma.chatThread.findFirst({
      where: { id: data.threadId, userId: session.user.id },
    });

    if (!thread) {
      throw new Error("Not found");
    }

    const updatedThread = await prisma.chatThread.update({
      where: { id: data.threadId },
      data: { title: data.title.trim() || "New chat" },
    });

    return mapThreadSummary(updatedThread);
  });

export const deleteChatThread = createServerFn({ method: "POST" })
  .inputValidator((data) => threadIdInputSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const thread = await prisma.chatThread.findFirst({
      where: { id: data.threadId, userId: session.user.id },
    });

    if (!thread) {
      throw new Error("Not found");
    }

    await prisma.chatThread.delete({ where: { id: data.threadId } });

    return { success: true };
  });

const DEFAULT_CHAT_EXPORT_FOLDER = "Aether/Chats/{YYYY}/{MM}";

function resolveExportFolder(template: string): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  return template
    .replace(/\{YYYY\}/g, yyyy)
    .replace(/\{MM\}/g, mm)
    .replace(/\{DD\}/g, dd);
}

function formatChatAsMarkdown(
  thread: {
    title: string;
    model: string;
    effort: string;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalEstimatedCostUsd: number;
    createdAt: Date;
    updatedAt: Date;
  },
  messages: AppChatMessage[],
): string {
  const modelDef = CHAT_MODELS.find((m) => m.id === thread.model);
  const createdDate = thread.createdAt.toISOString().split("T")[0];
  const updatedDate = thread.updatedAt.toISOString().split("T")[0];
  const messageCount = messages.length;

  const frontmatter = [
    "---",
    `title: "${thread.title.replace(/"/g, '\\"')}"`,
    `aliases:`,
    `  - "Chat: ${thread.title.replace(/"/g, '\\"')}"`,
    `model: ${modelDef?.label ?? thread.model}`,
    `effort: ${thread.effort}`,
    `created: ${createdDate}`,
    `updated: ${updatedDate}`,
    `messages: ${messageCount}`,
    `input_tokens: ${thread.totalInputTokens}`,
    `output_tokens: ${thread.totalOutputTokens}`,
    `estimated_cost_usd: ${thread.totalEstimatedCostUsd.toFixed(6)}`,
    `source: Aether Chat`,
    "---",
  ].join("\n");

  const body = messages
    .filter((msg) => msg.role === "user" || msg.role === "assistant")
    .map((msg) => {
      const role = msg.role === "user" ? "User" : "Assistant";
      const text = getMessageText(msg);
      return `## ${role}\n\n${text}`;
    })
    .join("\n\n---\n\n");

  return `${frontmatter}\n\n${body}\n`;
}

export const exportChatThreadToObsidian = createServerFn({ method: "POST" })
  .inputValidator((data) => threadIdInputSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const obsidianRoot = OBSIDIAN_DIR;
    if (!obsidianRoot) {
      throw new Error("Obsidian vault not configured");
    }

    const [thread, exportFolder] = await Promise.all([
      prisma.chatThread.findFirst({
        where: { id: data.threadId, userId: session.user.id },
      }),
      getUserPreference(session.user.id, "obsidianChatExportFolder"),
    ]);

    if (!thread) {
      throw new Error("Thread not found");
    }

    const folderTemplate = exportFolder || DEFAULT_CHAT_EXPORT_FOLDER;
    const folder = resolveExportFolder(folderTemplate);
    const filename = `${thread.id}.md`;
    const relativePath = folder ? `${folder}/${filename}` : filename;

    if (relativePath.includes("..")) {
      throw new Error("Invalid file path");
    }

    const absolutePath = path.join(obsidianRoot, relativePath);
    const resolvedPath = path.resolve(absolutePath);
    const resolvedRoot = path.resolve(obsidianRoot);

    if (!resolvedPath.startsWith(resolvedRoot)) {
      throw new Error("Path traversal detected");
    }

    const messages = parseStoredMessages(thread.messagesJson);
    const content = formatChatAsMarkdown(thread, messages);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, "utf8");

    try {
      await logFileChange({
        userId: session.user.id,
        filePath: relativePath,
        originalContent: null,
        newContent: content,
        changeSource: "manual",
        summary: `Exported chat "${thread.title}"`,
      });
    } catch (err) {
      logger.error({ err }, "Activity log failed for chat export");
    }

    return { success: true, relativePath };
  });
