import { tool } from "ai";
import { z } from "zod";
import { CHAT_MODELS } from "#/lib/chat-models";

export const listModels = tool({
  description:
    "List all available AI models with their IDs, descriptions, and capabilities. Use this when the user asks what models are available, wants to compare models, or needs help choosing a model.",
  inputSchema: z.object({}),
  execute: async () => {
    return CHAT_MODELS.map((m) => ({
      id: m.id,
      label: m.label,
      description: m.description,
      provider: m.provider,
      supportsEffort: m.supportsEffort,
      supportsCodeExecution: m.supportsCodeExecution,
      ...(("aliases" in m && m.aliases.length > 0) ? { aliases: m.aliases } : {}),
    }));
  },
});
