import { anthropic } from "@ai-sdk/anthropic";
import { createFileRoute } from "@tanstack/react-router";
import {
	convertToModelMessages,
	createIdGenerator,
	type LanguageModelUsage,
	streamText,
	type UIMessage,
} from "ai";
import { prisma } from "#/db";
import { auth } from "#/lib/auth";
import {
	type AppChatMessage,
	addChatUsageTotals,
	type ChatUsageEntry,
	type ChatUsageTotals,
	DEFAULT_CHAT_MODEL,
	estimateChatUsageCostUsd,
	getChatTitleFromMessages,
	isChatModel,
	parseUsageHistory,
	serializeMessages,
	serializeUsageHistory,
	usageTotalsFromLanguageModelUsage,
} from "#/lib/chat";

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
				const tools =
					model === "claude-haiku-4-5"
						? undefined
						: {
								web_fetch: anthropic.tools.webFetch_20260209({
									citations: { enabled: true },
									maxUses: 5,
								}),
								web_search: anthropic.tools.webSearch_20260209({
									maxUses: 5,
								}),
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

				await prisma.chatThread.update({
					where: { id: thread.id },
					data: {
						model,
						title: getChatTitleFromMessages(incomingMessages),
						messagesJson: serializeMessages(incomingMessages),
					},
				});

				const result = streamText({
					model: anthropic(model),
					messages: await convertToModelMessages(incomingMessages),
					tools,
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

						await prisma.chatThread.update({
							where: { id: thread.id },
							data: {
								model,
								title: getChatTitleFromMessages(finalMessages),
								messagesJson: serializeMessages(finalMessages),
								usageHistoryJson: serializeUsageHistory(
									update.nextUsageHistory,
								),
								totalInputTokens: update.nextTotals.inputTokens,
								totalOutputTokens: update.nextTotals.outputTokens,
								totalEstimatedCostUsd: update.nextTotals.estimatedCostUsd,
							},
						});
					},
				});
			},
		},
	},
});
