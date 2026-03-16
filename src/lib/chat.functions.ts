import { createServerFn } from "@tanstack/react-start";
import { prisma } from "#/db";
import { ensureSession } from "#/lib/auth.functions";
import {
	type ChatThreadSummary,
	DEFAULT_CHAT_EFFORT,
	DEFAULT_CHAT_MODEL,
	getChatPreviewFromMessages,
	isChatEffort,
	isChatModel,
	parseStoredMessages,
} from "#/lib/chat";

type ChatThreadInput = {
	threadId?: string;
};

type CreateThreadInput = {
	model?: string;
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

		const threadRecords = await prisma.chatThread.findMany({
			where: { userId: session.user.id, type: "chat" },
			orderBy: { updatedAt: "desc" },
		});

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
		};
	});

export const createChatThread = createServerFn({ method: "POST" })
	.inputValidator((data: CreateThreadInput) => data)
	.handler(async ({ data }) => {
		const session = await ensureSession();
		const model = data.model && isChatModel(data.model) ? data.model : DEFAULT_CHAT_MODEL;

		const thread = await prisma.chatThread.create({
			data: {
				id: `thread_${crypto.randomUUID()}`,
				userId: session.user.id,
				model,
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
