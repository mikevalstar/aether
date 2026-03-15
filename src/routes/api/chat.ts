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
				const tools: ToolSet =
					model === "claude-haiku-4-5"
						? {
								fetch_url_markdown: fetchUrlMarkdown,
								...obsidianTools,
							}
						: {
								web_fetch: anthropic.tools.webFetch_20260209({
									citations: { enabled: true },
									maxUses: 5,
								}),
								web_search: anthropic.tools.webSearch_20260209({
									maxUses: 5,
								}),
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

				const obsidianInstruction =
					" You also have access to the user's Obsidian vault via obsidian_tree, obsidian_search, obsidian_read, obsidian_write, and obsidian_edit tools. Use obsidian_tree to see the vault's folder and file structure, obsidian_search to find notes by content, obsidian_read to read their content, obsidian_write to create new notes or fully rewrite existing ones, and obsidian_edit to make targeted changes to existing notes by replacing specific text passages. Prefer obsidian_edit over obsidian_write when making partial updates — it's faster and less error-prone. When updating existing notes, focus on adding content rather than removing content unless the user explicitly asks you to remove something. Always read the target file with obsidian_read before writing or editing.";
				const toolInstruction = tools
					? `You have access to web search, web fetch, and fetch_url_markdown tools. When the user asks about current events, recent information, or anything that might benefit from up-to-date data, use these tools to find accurate answers. When the user shares a specific URL and wants you to read its content, prefer fetch_url_markdown as it returns clean, ad-free markdown.${obsidianInstruction}`
					: `You do not have web search capabilities in this mode. If the user asks for real-time information, let them know they can switch to Sonnet or Opus for web search. Do not attempt to use any tools.${obsidianInstruction}`;

				const systemPrompt = configuredPrompt
					? `${configuredPrompt}\n\n${toolInstruction}`
					: [
							"You are Aether, a helpful personal assistant. You are knowledgeable, concise, and friendly.",
							`Today's date is ${new Date().toLocaleDateString("en-CA")}.`,
							toolInstruction,
						].join("\n\n");

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
