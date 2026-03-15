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

export const DEFAULT_CHAT_MODEL: ChatModel = "claude-haiku-4-5";

export function isChatModel(value: string): value is ChatModel {
	return CHAT_MODELS.some((model) => model.id === value);
}
