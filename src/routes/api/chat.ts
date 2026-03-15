import { anthropic } from "@ai-sdk/anthropic";
import { createFileRoute } from "@tanstack/react-router";
import {
	convertToModelMessages,
	createIdGenerator,
	generateText,
	type LanguageModelUsage,
	stepCountIs,
	streamText,
	type ToolSet,
	type UIMessage,
} from "ai";
import { prisma } from "#/db";
import { readSystemPrompt, readTitlePromptConfig } from "#/lib/ai-config";
import { auth } from "#/lib/auth";
import {
	type AppChatMessage,
	addChatUsageTotals,
	type ChatUsageEntry,
	type ChatUsageTotals,
	DEFAULT_CHAT_MODEL,
	estimateChatUsageCostUsd,
	getChatTitleFromMessages,
	getMessageText,
	isChatModel,
	parseStoredMessages,
	parseUsageHistory,
	serializeMessages,
	serializeUsageHistory,
	usageTotalsFromLanguageModelUsage,
} from "#/lib/chat";
import { getWebToolVersion } from "#/lib/chat-models";
import { fetchUrlMarkdown } from "#/lib/tools/fetch-url-markdown";
import { createObsidianToolContext } from "#/lib/tools/obsidian-context";
import { createObsidianEdit } from "#/lib/tools/obsidian-edit";
import { createObsidianRead } from "#/lib/tools/obsidian-read";
import { obsidianSearch } from "#/lib/tools/obsidian-search";
import { obsidianFolders, obsidianList } from "#/lib/tools/obsidian-tree";
import { createObsidianWrite } from "#/lib/tools/obsidian-write";

async function generateChatTitle(userMessage: string): Promise<string> {
	try {
		const titleConfig = await readTitlePromptConfig();
		const titleModel = titleConfig?.model ?? "claude-haiku-4-5";
		const titleSystemPrompt =
			titleConfig?.prompt ??
			"Generate a short, descriptive title for a chat conversation based on the user's first message. The title must be no more than 10 words. Output only the title text, nothing else. No quotes, no punctuation at the end.";

		const { text } = await generateText({
			model: anthropic(titleModel),
			system: titleSystemPrompt,
			prompt: userMessage,
		});

		const title = text.trim().replace(/[."']+$/, "");
		return title || getChatTitleFromMessages([]);
	} catch {
		return userMessage.length <= 72
			? userMessage
			: `${userMessage.slice(0, 69).trimEnd()}...`;
	}
}

type ChatRequestBody = {
	id?: string;
	messages?: UIMessage[];
	model?: string;
};

export const Route = createFileRoute("/api/chat")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await auth.api.getSession({ headers: request.headers });

				if (!session) {
					return new Response("Unauthorized", { status: 401 });
				}

				const body = (await request.json()) as ChatRequestBody;
				const threadId = body.id;
				const incomingMessages = Array.isArray(body.messages)
					? (body.messages as AppChatMessage[])
					: [];

				if (!threadId || incomingMessages.length === 0) {
					return new Response("Invalid chat request", { status: 400 });
				}

				const thread = await prisma.chatThread.findFirst({
					where: {
						id: threadId,
						userId: session.user.id,
					},
				});

				if (!thread) {
					return new Response("Thread not found", { status: 404 });
				}

				const model =
					body.model && isChatModel(body.model)
						? body.model
						: DEFAULT_CHAT_MODEL;
				const obsidianCtx = createObsidianToolContext();
				const obsidianTools: ToolSet = {
					obsidian_folders: obsidianFolders,
					obsidian_list: obsidianList,
					obsidian_search: obsidianSearch,
					obsidian_read: createObsidianRead(obsidianCtx),
					obsidian_write: createObsidianWrite(obsidianCtx),
					obsidian_edit: createObsidianEdit(obsidianCtx),
				};
				const webToolVersion = getWebToolVersion(model);
				const webTools: ToolSet =
					webToolVersion === "latest"
						? {
								web_fetch: anthropic.tools.webFetch_20260209({
									citations: { enabled: true },
									maxUses: 5,
								}),
								web_search: anthropic.tools.webSearch_20260209({
									maxUses: 5,
								}),
							}
						: {
								web_fetch: anthropic.tools.webFetch_20250910({
									citations: { enabled: true },
									maxUses: 5,
								}),
								web_search: anthropic.tools.webSearch_20250305({
									maxUses: 5,
								}),
							};
				const tools: ToolSet = {
					...webTools,
					fetch_url_markdown: fetchUrlMarkdown,
					...obsidianTools,
				};
				const currentTotals: ChatUsageTotals = {
					inputTokens: thread.totalInputTokens ?? 0,
					outputTokens: thread.totalOutputTokens ?? 0,
					totalTokens:
						(thread.totalInputTokens ?? 0) + (thread.totalOutputTokens ?? 0),
					estimatedCostUsd: thread.totalEstimatedCostUsd ?? 0,
				};
				const usageHistory = parseUsageHistory(thread.usageHistoryJson ?? "[]");

				const createUsageUpdate = (
					usage: LanguageModelUsage | undefined,
					messages: AppChatMessage[],
				) => {
					const usageTotals = usageTotalsFromLanguageModelUsage(usage);
					const exchangeUsage: ChatUsageTotals = {
						...usageTotals,
						estimatedCostUsd: estimateChatUsageCostUsd(model, usageTotals),
					};
					const nextTotals = addChatUsageTotals(currentTotals, exchangeUsage);
					const assistantMessage = [...messages]
						.reverse()
						.find((message) => message.role === "assistant");
					const usageEntry: ChatUsageEntry = {
						id: `usage_${crypto.randomUUID()}`,
						model,
						createdAt: new Date().toISOString(),
						messageId: assistantMessage?.id,
						...exchangeUsage,
						cumulativeInputTokens: nextTotals.inputTokens,
						cumulativeOutputTokens: nextTotals.outputTokens,
						cumulativeTotalTokens: nextTotals.totalTokens,
						cumulativeEstimatedCostUsd: nextTotals.estimatedCostUsd,
					};

					return {
						exchangeUsage,
						nextTotals,
						usageEntry,
						nextUsageHistory: [...usageHistory, usageEntry],
					};
				};

				// Only generate an AI title on the first message (thread still has default title)
				const existingMessages = parseStoredMessages(
					thread.messagesJson ?? "[]",
				);
				const isFirstMessage =
					existingMessages.length === 0 && thread.title === "New chat";

				let title = thread.title;
				if (isFirstMessage) {
					const firstUserText =
						incomingMessages
							.filter((m) => m.role === "user")
							.map((m) => getMessageText(m))
							.find(Boolean) ?? "";
					if (firstUserText) {
						title = await generateChatTitle(firstUserText);
					}
				}

				await prisma.chatThread.update({
					where: { id: thread.id },
					data: {
						model,
						title,
						messagesJson: serializeMessages(incomingMessages),
					},
				});

				const userName = session.user.name || "User";
				const configuredPrompt = await readSystemPrompt(userName);

				if (!configuredPrompt) {
					return new Response("System prompt is not configured", {
						status: 500,
					});
				}

				const systemPrompt = configuredPrompt;

				const result = streamText({
					model: anthropic(model),
					system: systemPrompt,
					messages: await convertToModelMessages(incomingMessages),
					tools,
					stopWhen: stepCountIs(10),
				});

				return result.toUIMessageStreamResponse({
					originalMessages: incomingMessages,
					generateMessageId: createIdGenerator({
						prefix: "msg",
						size: 16,
					}),
					messageMetadata: ({ part }) => {
						if (part.type === "start") {
							return {
								createdAt: Date.now(),
								model,
							};
						}

						if (part.type === "finish") {
							const update = createUsageUpdate(
								part.totalUsage,
								incomingMessages,
							);

							return {
								model,
								usage: update.exchangeUsage,
								totals: update.nextTotals,
								usageEntry: update.usageEntry,
							};
						}
					},
					onFinish: async ({ messages }) => {
						const finalMessages = messages as AppChatMessage[];
						const totalUsage = await result.totalUsage;
						const update = createUsageUpdate(totalUsage, finalMessages);

						await prisma.$transaction([
							prisma.chatThread.update({
								where: { id: thread.id },
								data: {
									model,
									messagesJson: serializeMessages(finalMessages),
									usageHistoryJson: serializeUsageHistory(
										update.nextUsageHistory,
									),
									totalInputTokens: update.nextTotals.inputTokens,
									totalOutputTokens: update.nextTotals.outputTokens,
									totalEstimatedCostUsd: update.nextTotals.estimatedCostUsd,
								},
							}),
							prisma.chatUsageEvent.create({
								data: {
									id: `usage_event_${crypto.randomUUID()}`,
									userId: session.user.id,
									threadId: thread.id,
									model,
									inputTokens: update.exchangeUsage.inputTokens,
									outputTokens: update.exchangeUsage.outputTokens,
									totalTokens: update.exchangeUsage.totalTokens,
									estimatedCostUsd: update.exchangeUsage.estimatedCostUsd,
									createdAt: new Date(update.usageEntry.createdAt),
								},
							}),
						]);
					},
				});
			},
		},
	},
});
