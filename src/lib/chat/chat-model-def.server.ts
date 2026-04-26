import { prisma } from "#/db";
import {
  BUILTIN_CHAT_MODELS,
  type ChatModelDef,
  getModelProvider,
  type ModelProvider,
} from "#/lib/chat/chat-models";

/**
 * Resolve a model id to its full definition, consulting both built-ins and
 * the caller's UserSelectedModel rows. Returns undefined only when the id
 * matches neither — call sites should fall back to defaults in that case.
 *
 * The synthesized def for a user-selected row uses sane defaults for
 * capability flags (no native web tools, no code execution, no web tool
 * version) since OpenRouter routing handles that uniformly.
 */
export async function getChatModelDef(modelId: string, userId: string): Promise<ChatModelDef | undefined> {
  const builtin = BUILTIN_CHAT_MODELS.find((m) => m.id === modelId);
  if (builtin) return builtin;

  const sel = await prisma.userSelectedModel.findFirst({
    where: { userId, modelId },
  });
  if (!sel) return undefined;

  const provider: ModelProvider = isModelProvider(sel.provider) ? sel.provider : getModelProvider(modelId);

  return {
    id: sel.modelId,
    label: sel.label,
    description: sel.description ?? "",
    provider,
    supportsWebTools: false,
    supportsEffort: sel.supportsEffort,
    supportsCodeExecution: false,
    webToolVersion: "none",
    pricing: {
      inputCostPerMillionTokensUsd: sel.inputCostPerMillionTokensUsd ?? 0,
      outputCostPerMillionTokensUsd: sel.outputCostPerMillionTokensUsd ?? 0,
    },
  };
}

function isModelProvider(value: string): value is ModelProvider {
  return value === "anthropic" || value === "openrouter" || value === "minimax";
}
