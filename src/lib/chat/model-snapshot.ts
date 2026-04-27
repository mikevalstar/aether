import { prisma } from "#/db";
import { BUILTIN_CHAT_MODELS, getModelProvider } from "#/lib/chat/chat-models";

export type ModelSnapshot = {
  modelLabel: string;
  modelProvider: string;
};

/**
 * Resolve label + provider for a model id at the moment of writing.
 * Lookup order: built-in catalog → user's saved selection → derived defaults.
 *
 * Persist the result alongside any row that stores `model` so the row can
 * still render correctly after the model is removed from the catalog or the
 * user's selections.
 */
export async function snapshotModelMeta(modelId: string, userId?: string): Promise<ModelSnapshot> {
  const builtin = BUILTIN_CHAT_MODELS.find((m) => m.id === modelId);
  if (builtin) {
    return { modelLabel: builtin.label, modelProvider: builtin.provider };
  }
  if (userId) {
    const sel = await prisma.userSelectedModel.findFirst({
      where: { userId, modelId },
      select: { label: true, provider: true },
    });
    if (sel) return { modelLabel: sel.label, modelProvider: sel.provider };
  }
  return { modelLabel: modelId, modelProvider: getModelProvider(modelId) };
}

/**
 * Sync version — only consults built-ins. Use for hot paths or call sites
 * that don't have userId. Falls back to the bare id + provider heuristic.
 */
export function snapshotBuiltinModelMeta(modelId: string): ModelSnapshot {
  const builtin = BUILTIN_CHAT_MODELS.find((m) => m.id === modelId);
  if (builtin) return { modelLabel: builtin.label, modelProvider: builtin.provider };
  return { modelLabel: modelId, modelProvider: getModelProvider(modelId) };
}
