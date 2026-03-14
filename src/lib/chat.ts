import type { LanguageModelUsage, UIMessage } from "ai";

export const ANTHROPIC_PRICING_SOURCE_URL =
	"https://docs.anthropic.com/en/docs/about-claude/models/overview";

export type ChatUsageTotals = {
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
	estimatedCostUsd: number;
};

export type ChatUsageEntry = ChatUsageTotals & {
	id: string;
	model: ChatModel;
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

export const CHAT_MODELS = [
	{
		id: "claude-haiku-4-5",
		label: "Claude Haiku 4.5",
		description: "Fastest",
		pricing: {
			inputCostPerMillionTokensUsd: 1,
			outputCostPerMillionTokensUsd: 5,
		},
	},
	{
		id: "claude-sonnet-4-6",
		label: "Claude Sonnet 4.6",
		description: "Balanced",
		pricing: {
			inputCostPerMillionTokensUsd: 3,
			outputCostPerMillionTokensUsd: 15,
		},
	},
	{
		id: "claude-opus-4-6",
		label: "Claude Opus 4.6",
		description: "Strongest",
		pricing: {
			inputCostPerMillionTokensUsd: 5,
			outputCostPerMillionTokensUsd: 25,
		},
	},
] as const;

export type ChatModel = (typeof CHAT_MODELS)[number]["id"];

export type AppChatMessage = UIMessage<ChatMessageMetadata, never, never>;

export const DEFAULT_CHAT_MODEL: ChatModel = "claude-haiku-4-5";

export type ChatThreadSummary = {
	id: string;
	title: string;
	model: ChatModel;
	preview: string;
	totalInputTokens: number;
	totalOutputTokens: number;
	totalEstimatedCostUsd: number;
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
