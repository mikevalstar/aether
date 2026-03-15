import type { LanguageModelUsage, UIMessage } from "ai";
import {
	CHAT_MODELS,
	type ChatEffort,
	type ChatModel,
} from "#/lib/chat-models";

export {
	CHAT_EFFORT_LEVELS,
	CHAT_MODELS,
	type ChatEffort,
	type ChatModel,
	DEFAULT_CHAT_EFFORT,
	DEFAULT_CHAT_MODEL,
	isChatEffort,
	isChatModel,
} from "#/lib/chat-models";

export const ANTHROPIC_PRICING_SOURCE_URL =
	"https://docs.anthropic.com/en/docs/about-claude/models/overview";

export type ChatUsageTotals = {
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
	estimatedCostUsd: number;
};

export type ChatTaskType = "chat" | "title";

export type ChatUsageEntry = ChatUsageTotals & {
	id: string;
	model: ChatModel;
	taskType: ChatTaskType;
	createdAt: string;
	messageId?: string;
	cumulativeInputTokens: number;
	cumulativeOutputTokens: number;
	cumulativeTotalTokens: number;
	cumulativeEstimatedCostUsd: number;
};

export type ChatMessageMetadata = {
	createdAt?: number;
	model?: ChatModel;
	usage?: ChatUsageTotals;
	totals?: ChatUsageTotals;
	usageEntry?: ChatUsageEntry;
};

export type AppChatMessage = UIMessage<ChatMessageMetadata, never, never>;

export type ChatThreadSummary = {
	id: string;
	title: string;
	model: ChatModel;
	effort: ChatEffort;
	preview: string;
	totalInputTokens: number;
	totalOutputTokens: number;
	totalEstimatedCostUsd: number;
	updatedAt: string;
	createdAt: string;
};

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

export function parseUsageHistory(value: string): ChatUsageEntry[] {
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? (parsed as ChatUsageEntry[]) : [];
	} catch {
		return [];
	}
}

export function serializeUsageHistory(entries: ChatUsageEntry[]): string {
	return JSON.stringify(entries);
}

export function usageTotalsFromLanguageModelUsage(
	usage: LanguageModelUsage | undefined,
): ChatUsageTotals {
	const inputTokens = usage?.inputTokens ?? 0;
	const outputTokens = usage?.outputTokens ?? 0;

	return {
		inputTokens,
		outputTokens,
		totalTokens: usage?.totalTokens ?? inputTokens + outputTokens,
		estimatedCostUsd: 0,
	};
}

export function estimateChatUsageCostUsd(
	model: ChatModel,
	usage: Pick<ChatUsageTotals, "inputTokens" | "outputTokens">,
): number {
	const pricing = CHAT_MODELS.find(
		(candidate) => candidate.id === model,
	)?.pricing;

	if (!pricing) return 0;

	return roundUsd(
		(usage.inputTokens / 1_000_000) * pricing.inputCostPerMillionTokensUsd +
			(usage.outputTokens / 1_000_000) * pricing.outputCostPerMillionTokensUsd,
	);
}

export function addChatUsageTotals(
	left: ChatUsageTotals,
	right: ChatUsageTotals,
): ChatUsageTotals {
	return {
		inputTokens: left.inputTokens + right.inputTokens,
		outputTokens: left.outputTokens + right.outputTokens,
		totalTokens: left.totalTokens + right.totalTokens,
		estimatedCostUsd: roundUsd(left.estimatedCostUsd + right.estimatedCostUsd),
	};
}

export function createEmptyChatUsageTotals(): ChatUsageTotals {
	return {
		inputTokens: 0,
		outputTokens: 0,
		totalTokens: 0,
		estimatedCostUsd: 0,
	};
}

function roundUsd(value: number): number {
	return Math.round(value * 1_000_000) / 1_000_000;
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
