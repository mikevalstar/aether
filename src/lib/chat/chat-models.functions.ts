import { createServerFn } from "@tanstack/react-start";
import { ensureSession } from "#/lib/auth.functions";
import { BUILTIN_CHAT_MODELS, type ChatModelDef } from "#/lib/chat/chat-models";
import { prisma } from "#/db";

export type ChatModelOption = {
  id: string;
  label: string;
  description: string;
  supportsEffort: boolean;
  provider: string;
  inputCostPerMillionTokensUsd?: number;
  outputCostPerMillionTokensUsd?: number;
  /** True for user-picked OpenRouter models — distinguishes them in the UI. */
  userSelected?: boolean;
};

function builtinToOption(m: ChatModelDef): ChatModelOption {
  return {
    id: m.id,
    label: m.label,
    description: m.description,
    supportsEffort: m.supportsEffort,
    provider: m.provider,
    inputCostPerMillionTokensUsd: m.pricing.inputCostPerMillionTokensUsd,
    outputCostPerMillionTokensUsd: m.pricing.outputCostPerMillionTokensUsd,
  };
}

export const listChatModels = createServerFn({ method: "GET" }).handler(async (): Promise<ChatModelOption[]> => {
  const session = await ensureSession();
  const builtinIds = new Set(BUILTIN_CHAT_MODELS.map((m) => m.id));
  const selections = await prisma.userSelectedModel.findMany({
    where: { userId: session.user.id },
    orderBy: { addedAt: "asc" },
  });

  const userOptions: ChatModelOption[] = selections
    .filter((s) => !builtinIds.has(s.modelId))
    .map((s) => ({
      id: s.modelId,
      label: s.label,
      description: s.description ?? "",
      supportsEffort: s.supportsEffort,
      provider: s.provider,
      inputCostPerMillionTokensUsd: s.inputCostPerMillionTokensUsd ?? undefined,
      outputCostPerMillionTokensUsd: s.outputCostPerMillionTokensUsd ?? undefined,
      userSelected: true,
    }));

  return [...BUILTIN_CHAT_MODELS.map(builtinToOption), ...userOptions];
});
