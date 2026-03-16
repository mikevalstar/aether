import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef } from "react";
import { Thread } from "#/components/assistant-ui/thread";
import {
	type AppChatMessage,
	type ChatEffort,
	type ChatModel,
	DEFAULT_CHAT_EFFORT,
	DEFAULT_CHAT_MODEL,
	parseStoredMessages,
} from "#/lib/chat";

type ChatWorkspaceProps = {
	threadId: string;
	model: ChatModel;
	effort: ChatEffort;
	messagesJson: string;
	initialMessage?: string;
	onFinish?: () => void;
};

export function ChatWorkspace({ threadId, model, effort, messagesJson, initialMessage, onFinish }: ChatWorkspaceProps) {
	const hasBootstrappedMessage = useRef(false);

	const chat = useChat<AppChatMessage>({
		id: threadId,
		messages: parseStoredMessages(messagesJson),
		transport: new DefaultChatTransport<AppChatMessage>({
			api: "/api/chat",
			prepareSendMessagesRequest: async (options) => ({
				body: {
					...(options.body ?? {}),
					id: threadId,
					messages: options.messages,
					trigger: options.trigger,
					messageId: options.messageId,
					model: model ?? DEFAULT_CHAT_MODEL,
					effort: effort ?? DEFAULT_CHAT_EFFORT,
				},
			}),
		}),
		onFinish: () => {
			onFinish?.();
		},
	});

	useEffect(() => {
		if (hasBootstrappedMessage.current) return;
		if (!initialMessage?.trim()) return;
		if (chat.messages.length > 0) return;

		hasBootstrappedMessage.current = true;
		void chat.sendMessage({ text: initialMessage.trim() });
	}, [chat, initialMessage]);

	const runtime = useAISDKRuntime(chat);

	return (
		<AssistantRuntimeProvider runtime={runtime}>
			<div className="flex h-full min-h-0 flex-col">
				{chat.error ? (
					<div className="mx-4 mt-4 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-700 dark:text-red-200">
						{chat.error.message}
					</div>
				) : null}
				<div className="min-h-0 flex-1">
					<Thread />
				</div>
			</div>
		</AssistantRuntimeProvider>
	);
}
