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

export type ModelProvider = "anthropic" | "openrouter" | "minimax";
export type WebToolVersion = "legacy" | "latest" | "none";

export type ChatModelDef = {
  id: string;
  label: string;
  description: string;
  supportsWebTools: boolean;
  supportsEffort: boolean;
  supportsCodeExecution: boolean;
  webToolVersion: WebToolVersion;
  provider: ModelProvider;
  aliases?: readonly string[];
  providerIds?: Record<string, string>;
  pricing: {
    inputCostPerMillionTokensUsd: number;
    outputCostPerMillionTokensUsd: number;
  };
};

export const BUILTIN_CHAT_MODELS: readonly ChatModelDef[] = [
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    description: "Fastest",
    supportsWebTools: true,
    supportsEffort: false,
    supportsCodeExecution: false,
    webToolVersion: "legacy",
    provider: "anthropic",
    pricing: { inputCostPerMillionTokensUsd: 1, outputCostPerMillionTokensUsd: 5 },
  },
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    description: "Balanced",
    supportsWebTools: true,
    supportsEffort: true,
    supportsCodeExecution: true,
    webToolVersion: "latest",
    provider: "anthropic",
    pricing: { inputCostPerMillionTokensUsd: 3, outputCostPerMillionTokensUsd: 15 },
  },
  {
    id: "claude-opus-4-6",
    label: "Claude Opus 4.6",
    description: "Strongest",
    supportsWebTools: true,
    supportsEffort: true,
    supportsCodeExecution: true,
    webToolVersion: "latest",
    provider: "anthropic",
    pricing: { inputCostPerMillionTokensUsd: 5, outputCostPerMillionTokensUsd: 25 },
  },
  {
    id: "MiniMax-M2.7",
    label: "MiniMax M2.7",
    description: "Agentic, autonomous",
    supportsWebTools: true,
    supportsEffort: false,
    supportsCodeExecution: false,
    webToolVersion: "none",
    provider: "minimax",
    aliases: ["minimax/minimax-m2.7"],
    providerIds: {
      minimax: "MiniMax-M2.7",
      openrouter: "minimax/minimax-m2.7",
    },
    pricing: { inputCostPerMillionTokensUsd: 0.3, outputCostPerMillionTokensUsd: 1.2 },
  },
];

/**
 * Back-compat alias. Built-in chat models — does NOT include user-selected
 * OpenRouter models. Use listChatModels() / getAvailableModels() to get the
 * merged list.
 */
export const CHAT_MODELS: readonly ChatModelDef[] = BUILTIN_CHAT_MODELS;

/**
 * `ChatModel` used to be a union of the built-in ids. With user-selectable
 * OpenRouter models it has to be `string`. Validation now happens at I/O
 * boundaries (server fns, file parsers) instead of in the type system.
 */
export type ChatModel = string;

export const DEFAULT_CHAT_MODEL: ChatModel = "claude-haiku-4-5";

const OPENROUTER_ID_PATTERN = /^[a-z0-9._-]+\/[a-z0-9._-]+$/i;

/**
 * Resolve any model id or alias to its canonical id.
 * - Built-in id or alias → built-in id
 * - String matching `provider/model` (OpenRouter convention) → returned as-is
 *   (we can't sync-validate against the user's selection here)
 * - Anything else → undefined
 */
export function resolveModelId(value: string): ChatModel | undefined {
  const direct = BUILTIN_CHAT_MODELS.find((m) => m.id === value);
  if (direct) return direct.id;
  const byAlias = BUILTIN_CHAT_MODELS.find((m) => m.aliases?.includes(value));
  if (byAlias) return byAlias.id;
  if (OPENROUTER_ID_PATTERN.test(value)) return value;
  return undefined;
}

function findBuiltin(model: string): ChatModelDef | undefined {
  return BUILTIN_CHAT_MODELS.find((m) => m.id === model);
}

/**
 * Look up a model definition. Pass `extras` (e.g. user-selected OpenRouter
 * models) to find non-built-in entries.
 */
export function findModelDef(model: string, extras?: readonly ChatModelDef[]): ChatModelDef | undefined {
  return findBuiltin(model) ?? extras?.find((m) => m.id === model);
}

export function getWebToolVersion(model: string): WebToolVersion {
  const def = findBuiltin(model);
  if (def) return def.webToolVersion;
  // Unknown (user-selected OpenRouter) models: web tools are not supported by default.
  return "none";
}

export function getModelProvider(model: string): ModelProvider {
  const def = findBuiltin(model);
  if (def) return def.provider;
  // Unknown ids in `provider/model` form go through OpenRouter.
  if (OPENROUTER_ID_PATTERN.test(model)) return "openrouter";
  return "anthropic";
}

/** Get the provider-specific model ID to send to the API. */
export function getProviderModelId(model: string, provider: string): string {
  const def = findBuiltin(model);
  if (def?.providerIds && provider in def.providerIds) {
    return def.providerIds[provider];
  }
  return model;
}

export function supportsCodeExecution(model: string): boolean {
  return findBuiltin(model)?.supportsCodeExecution ?? false;
}
