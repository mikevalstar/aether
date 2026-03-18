export const CHAT_EFFORT_LEVELS = ["low", "medium", "high"] as const;
export type ChatEffort = (typeof CHAT_EFFORT_LEVELS)[number];
export const DEFAULT_CHAT_EFFORT: ChatEffort = "low";

export function isChatEffort(value: string): value is ChatEffort {
  return CHAT_EFFORT_LEVELS.includes(value as ChatEffort);
}

export const CHAT_MODELS = [
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    description: "Fastest",
    supportsWebTools: true,
    supportsEffort: false,
    webToolVersion: "legacy" as const,
    pricing: {
      inputCostPerMillionTokensUsd: 1,
      outputCostPerMillionTokensUsd: 5,
    },
  },
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    description: "Balanced",
    supportsWebTools: true,
    supportsEffort: true,
    webToolVersion: "latest" as const,
    pricing: {
      inputCostPerMillionTokensUsd: 3,
      outputCostPerMillionTokensUsd: 15,
    },
  },
  {
    id: "claude-opus-4-6",
    label: "Claude Opus 4.6",
    description: "Strongest",
    supportsWebTools: true,
    supportsEffort: true,
    webToolVersion: "latest" as const,
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

export type WebToolVersion = (typeof CHAT_MODELS)[number]["webToolVersion"];

export function getWebToolVersion(model: ChatModel): WebToolVersion {
  return CHAT_MODELS.find((m) => m.id === model)?.webToolVersion ?? "legacy";
}
