import type { UIMessage } from "ai";

export const CHAT_MODELS = [
	{
		id: "claude-haiku-4-5",
		label: "Claude Haiku 4.5",
		description: "Fastest",
	},
	{
		id: "claude-sonnet-4-6",
		label: "Claude Sonnet 4.6",
		description: "Balanced",
	},
	{
		id: "claude-opus-4-6",
		label: "Claude Opus 4.6",
		description: "Strongest",
	},
] as const;

export type ChatModel = (typeof CHAT_MODELS)[number]["id"];

export type AppChatMessage = UIMessage<Record<string, never>, never, never>;

export const DEFAULT_CHAT_MODEL: ChatModel = "claude-haiku-4-5";

export type ChatThreadSummary = {
	id: string;
	title: string;
	model: ChatModel;
	preview: string;
	updatedAt: string;
	createdAt: string;
};

export function isChatModel(value: string): value is ChatModel {
	return CHAT_MODELS.some((model) => model.id === value);
}

export function parseStoredMessages(value: string): AppChatMessage[] {
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? (parsed as AppChatMessage[]) : [];
	} catch {
		return [];
	}
}

export function serializeMessages(messages: AppChatMessage[]): string {
	return JSON.stringify(messages);
}

export function getMessageText(message: AppChatMessage | undefined): string {
	if (!message?.parts) return "";

	return message.parts
		.flatMap((part) => {
			if (part.type !== "text") return [];
			return typeof part.text === "string" ? [part.text] : [];
		})
		.join(" ")
		.replace(/\s+/g, " ")
		.trim();
}

export function getChatTitleFromMessages(messages: AppChatMessage[]): string {
	const firstUserText = messages
		.filter((message) => message.role === "user")
		.map((message) => getMessageText(message))
		.find(Boolean);

	if (!firstUserText) return "New chat";
	if (firstUserText.length <= 72) return firstUserText;

	return `${firstUserText.slice(0, 69).trimEnd()}...`;
}

export function getChatPreviewFromMessages(messages: AppChatMessage[]): string {
	const preview = [...messages]
		.reverse()
		.map((message) => getMessageText(message))
		.find(Boolean);

	if (!preview) return "Start a conversation";
	if (preview.length <= 96) return preview;

	return `${preview.slice(0, 93).trimEnd()}...`;
}
