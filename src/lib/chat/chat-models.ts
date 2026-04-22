export const CHAT_EFFORT_LEVELS = ["low", "medium", "high"] as const;
export type ChatEffort = (typeof CHAT_EFFORT_LEVELS)[number];
export const DEFAULT_CHAT_EFFORT: ChatEffort = "low";

export const EFFORT_LABELS: Record<ChatEffort, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

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
    id: "MiniMax-M2.7",
    label: "MiniMax M2.7",
    description: "Agentic, autonomous",
    supportsWebTools: true,
    supportsEffort: false,
    supportsCodeExecution: false,
    webToolVersion: "none" as const,
    provider: "minimax" as const,
    aliases: ["minimax/minimax-m2.7"] as readonly string[],
    providerIds: {
      minimax: "MiniMax-M2.7",
      openrouter: "minimax/minimax-m2.7",
    } as Record<string, string>,
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
  {
    id: "z-ai/glm-5.1",
    label: "GLM-5.1",
    description: "Complex systems engineering",
    supportsWebTools: true,
    supportsEffort: false,
    supportsCodeExecution: false,
    webToolVersion: "none" as const,
    provider: "openrouter" as const,
    pricing: {
      inputCostPerMillionTokensUsd: 1.26,
      outputCostPerMillionTokensUsd: 3.96,
    },
  },
  {
    id: "moonshotai/kimi-k2.5",
    label: "Kimi K2.5",
    description: "Low-cost reasoning",
    supportsWebTools: true,
    supportsEffort: false,
    supportsCodeExecution: false,
    webToolVersion: "none" as const,
    provider: "openrouter" as const,
    pricing: {
      inputCostPerMillionTokensUsd: 0.44,
      outputCostPerMillionTokensUsd: 2.2,
    },
  },
  {
    id: "moonshotai/kimi-k2.6",
    label: "Kimi K2.6",
    description: "Agentic coding, multi-agent",
    supportsWebTools: true,
    supportsEffort: false,
    supportsCodeExecution: false,
    webToolVersion: "none" as const,
    provider: "openrouter" as const,
    pricing: {
      inputCostPerMillionTokensUsd: 0.75,
      outputCostPerMillionTokensUsd: 3.5,
    },
  },
] as const;

export type ChatModel = (typeof CHAT_MODELS)[number]["id"];

export const DEFAULT_CHAT_MODEL: ChatModel = "claude-haiku-4-5";

/** Resolve any model ID or alias to its canonical ChatModel ID. */
export function resolveModelId(value: string): ChatModel | undefined {
  const direct = CHAT_MODELS.find((m) => m.id === value);
  if (direct) return direct.id;
  const byAlias = CHAT_MODELS.find((m) => "aliases" in m && m.aliases.includes(value));
  if (byAlias) return byAlias.id;
  return undefined;
}

export type WebToolVersion = (typeof CHAT_MODELS)[number]["webToolVersion"];
export type ModelProvider = "anthropic" | "openrouter" | "minimax";

function findModel(model: ChatModel) {
  return CHAT_MODELS.find((m) => m.id === model);
}

export function getWebToolVersion(model: ChatModel): WebToolVersion {
  return findModel(model)?.webToolVersion ?? "legacy";
}

export function getModelProvider(model: ChatModel): ModelProvider {
  return findModel(model)?.provider ?? "anthropic";
}

/** Get the provider-specific model ID to send to the API. */
export function getProviderModelId(model: ChatModel, provider: string): string {
  const def = findModel(model);
  if (def && "providerIds" in def && provider in def.providerIds) {
    return def.providerIds[provider];
  }
  return model;
}

export function supportsCodeExecution(model: ChatModel): boolean {
  return findModel(model)?.supportsCodeExecution ?? false;
}
