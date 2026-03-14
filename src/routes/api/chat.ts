import { anthropic } from "@ai-sdk/anthropic";
import { createFileRoute } from "@tanstack/react-router";
import {
	convertToModelMessages,
	createIdGenerator,
	streamText,
	type UIMessage,
} from "ai";
import { prisma } from "#/db";
import { auth } from "#/lib/auth";
import {
	type AppChatMessage,
	DEFAULT_CHAT_MODEL,
	getChatTitleFromMessages,
	isChatModel,
	serializeMessages,
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
				});

				return result.toUIMessageStreamResponse({
					originalMessages: incomingMessages,
					generateMessageId: createIdGenerator({
						prefix: "msg",
						size: 16,
					}),
					onFinish: async ({ messages }) => {
						await prisma.chatThread.update({
							where: { id: thread.id },
							data: {
								model,
								title: getChatTitleFromMessages(messages as AppChatMessage[]),
								messagesJson: serializeMessages(messages as AppChatMessage[]),
							},
						});
					},
				});
			},
		},
	},
});
