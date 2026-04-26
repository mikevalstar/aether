import { createServerFn } from "@tanstack/react-start";
import { ensureSession } from "#/lib/auth.functions";
import type { CHAT_MODELS } from "#/lib/chat/chat-models";
import type { SkillSummary } from "#/lib/skills";
import type { SubAgentSummary } from "#/lib/sub-agents";

export type ToolParamInfo = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

export type ToolInfo = {
  name: string;
  description: string;
  parameters: ToolParamInfo[];
  category: string;
  conditional?: string;
  isProviderTool: boolean;
};

export type ModelInfo = (typeof CHAT_MODELS)[number] & {
  isDefault: boolean;
};

export type ChatDebugData = {
  models: ModelInfo[];
  defaultModel: string;
  userDefaultModel: string;
  effortLevels: readonly string[];
  defaultEffort: string;
  tools: ToolInfo[];
  skills: SkillSummary[];
  subAgents: SubAgentSummary[];
  plugins: { id: string; name: string; description: string; version: string; hasHealthCheck: boolean; enabled: boolean }[];
  config: {
    hasAnthropicKey: boolean;
    hasOpenRouterKey: boolean;
    hasObsidianDir: boolean;
    obsidianDir: string;
    hasExaKey: boolean;
    maxToolSteps: number;
  };
};

/**
 * Server-fn wrapper that resolves the current user from the session and delegates
 * to {@link buildChatDebugData}. The `/chat-debug` route uses this; the debug CLI
 * calls `buildChatDebugData` directly with an explicit user id.
 */
export const getChatDebugData = createServerFn({ method: "GET" }).handler(async (): Promise<ChatDebugData> => {
  const session = await ensureSession();
  const { buildChatDebugData } = await import("#/lib/debug/chat-debug-data");
  return buildChatDebugData(session.user.id);
});
