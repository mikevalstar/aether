import { createServerFn } from "@tanstack/react-start";
import { ensureSession } from "#/lib/auth.functions";
import { CHAT_MODELS } from "#/lib/chat/chat-models";

export type ChatModelOption = {
  id: string;
  label: string;
  description: string;
  supportsEffort: boolean;
  provider: string;
};

export const listChatModels = createServerFn({ method: "GET" }).handler(async (): Promise<ChatModelOption[]> => {
  await ensureSession();
  return CHAT_MODELS.map((m) => ({
    id: m.id,
    label: m.label,
    description: m.description,
    supportsEffort: m.supportsEffort,
    provider: m.provider,
  }));
});
