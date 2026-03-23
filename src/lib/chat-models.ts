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
    supportsCodeExecution: false,
    webToolVersion: "legacy" as const,
    provider: "anthropic" as const,
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
    supportsCodeExecution: true,
    webToolVersion: "latest" as const,
    provider: "anthropic" as const,
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
    supportsCodeExecution: true,
    webToolVersion: "latest" as const,
    provider: "anthropic" as const,
    pricing: {
      inputCostPerMillionTokensUsd: 5,
      outputCostPerMillionTokensUsd: 25,
    },
  },
  {
    id: "minimax/minimax-m2.7",
    label: "MiniMax M2.7",
    description: "Agentic, autonomous",
    supportsWebTools: true,
    supportsEffort: false,
    supportsCodeExecution: false,
    webToolVersion: "none" as const,
    provider: "openrouter" as const,
    pricing: {
      inputCostPerMillionTokensUsd: 0.3,
      outputCostPerMillionTokensUsd: 1.2,
    },
  },
  {
    id: "z-ai/glm-5",
    label: "GLM-5",
    description: "Complex systems engineering",
    supportsWebTools: true,
    supportsEffort: false,
    supportsCodeExecution: false,
    webToolVersion: "none" as const,
    provider: "openrouter" as const,
    pricing: {
      inputCostPerMillionTokensUsd: 0.72,
      outputCostPerMillionTokensUsd: 2.3,
    },
  },
] as const;

export type ChatModel = (typeof CHAT_MODELS)[number]["id"];

export const DEFAULT_CHAT_MODEL: ChatModel = "claude-haiku-4-5";

export function isChatModel(value: string): value is ChatModel {
  return CHAT_MODELS.some((model) => model.id === value);
}

export type WebToolVersion = (typeof CHAT_MODELS)[number]["webToolVersion"];
export type ModelProvider = "anthropic" | "openrouter";

export function getWebToolVersion(model: ChatModel): WebToolVersion {
  return CHAT_MODELS.find((m) => m.id === model)?.webToolVersion ?? "legacy";
}

export function getModelProvider(model: ChatModel): ModelProvider {
  return CHAT_MODELS.find((m) => m.id === model)?.provider ?? "anthropic";
}

export function supportsCodeExecution(model: ChatModel): boolean {
  return CHAT_MODELS.find((m) => m.id === model)?.supportsCodeExecution ?? false;
}
