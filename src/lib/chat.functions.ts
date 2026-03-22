import { promises as fs } from "node:fs";
import path from "node:path";
import { createServerFn } from "@tanstack/react-start";
import { prisma } from "#/db";
import { logFileChange } from "#/lib/activity";
import { ensureSession } from "#/lib/auth.functions";
import {
  type AppChatMessage,
  CHAT_MODELS,
  type ChatThreadSummary,
  DEFAULT_CHAT_EFFORT,
  DEFAULT_CHAT_MODEL,
  getChatPreviewFromMessages,
  getMessageText,
  isChatEffort,
  isChatModel,
  parseStoredMessages,
} from "#/lib/chat";
import { logger } from "#/lib/logger";
import { parsePreferences } from "#/lib/preferences";

type ChatThreadInput = {
  threadId?: string;
};

type CreateThreadInput = {
  model?: string;
  effort?: string;
};

type UpdateThreadModelInput = {
  threadId: string;
  model: string;
};

type UpdateThreadTitleInput = {
  threadId: string;
  title: string;
};

type DeleteThreadInput = {
  threadId: string;
};

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
    model: isChatModel(thread.model) ? thread.model : DEFAULT_CHAT_MODEL,
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
  .inputValidator((data: ChatThreadInput) => data)
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const [threadRecords, user] = await Promise.all([
      prisma.chatThread.findMany({
        where: { userId: session.user.id, type: "chat" },
        orderBy: { updatedAt: "desc" },
        take: 500,
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { preferences: true },
      }),
    ]);

    const preferences = parsePreferences(user?.preferences);
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
      defaultChatModel: preferences.defaultChatModel ?? DEFAULT_CHAT_MODEL,
    };
  });

export const createChatThread = createServerFn({ method: "POST" })
  .inputValidator((data: CreateThreadInput) => data)
  .handler(async ({ data }) => {
    const session = await ensureSession();
    const model = data.model && isChatModel(data.model) ? data.model : DEFAULT_CHAT_MODEL;
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
  .inputValidator((data: UpdateThreadModelInput) => data)
  .handler(async ({ data }) => {
    const session = await ensureSession();

    if (!isChatModel(data.model)) {
      throw new Error("Invalid model");
    }

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
  .inputValidator((data: { threadId: string; effort: string }) => data)
  .handler(async ({ data }) => {
    const session = await ensureSession();

    if (!isChatEffort(data.effort)) {
      throw new Error("Invalid effort level");
    }

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
  .inputValidator((data: UpdateThreadTitleInput) => data)
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
  .inputValidator((data: DeleteThreadInput) => data)
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

type ExportChatInput = {
  threadId: string;
};

export const exportChatThreadToObsidian = createServerFn({ method: "POST" })
  .inputValidator((data: ExportChatInput) => data)
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const obsidianRoot = process.env.OBSIDIAN_DIR ?? "";
    if (!obsidianRoot) {
      throw new Error("Obsidian vault not configured");
    }

    const [thread, user] = await Promise.all([
      prisma.chatThread.findFirst({
        where: { id: data.threadId, userId: session.user.id },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { preferences: true },
      }),
    ]);

    if (!thread) {
      throw new Error("Thread not found");
    }

    const prefs = parsePreferences(user?.preferences);
    const folderTemplate = prefs.obsidianChatExportFolder || DEFAULT_CHAT_EXPORT_FOLDER;
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
