/**
 * Session-free version of `getChatDebugData` for the debug CLI.
 *
 * Mirrors `src/lib/chat/chat-debug.functions.ts` but takes a `userId` directly
 * instead of pulling it from the request session. Use this from any context
 * (CLI scripts, background jobs) that doesn't have a Better Auth session.
 *
 * The `getChatDebugData` server function should call this so the route and the
 * CLI render the same shape.
 */

import { createAiTools, getToolCategories } from "#/lib/ai-tools";
import type { ChatDebugData, ModelInfo, ToolInfo, ToolParamInfo } from "#/lib/chat/chat-debug.functions";
import {
  CHAT_EFFORT_LEVELS,
  CHAT_MODELS,
  type ChatModel,
  DEFAULT_CHAT_EFFORT,
  DEFAULT_CHAT_MODEL,
} from "#/lib/chat/chat-models";
import { OBSIDIAN_DIR } from "#/lib/obsidian/obsidian";
import { getUserPreferences } from "#/lib/preferences.server";
import { readAllSkills } from "#/lib/skills";
import { readAllSubAgents } from "#/lib/sub-agents";
import { getAllPluginTools, getRegisteredPlugins } from "#/plugins/index.server";

function extractZodParams(schema: unknown): ToolParamInfo[] {
  if (!schema || typeof schema !== "object") return [];
  const shape = (schema as Record<string, unknown>).shape;
  if (!shape || typeof shape !== "object") return [];

  const params: ToolParamInfo[] = [];
  for (const [name, field] of Object.entries(shape as Record<string, Record<string, unknown>>)) {
    const fieldType = (field.type as string) ?? "unknown";
    const isOptional = fieldType === "optional" || fieldType === "default";
    const innerType = isOptional
      ? (((field.def as Record<string, Record<string, unknown>>)?.innerType?.type as string) ?? fieldType)
      : fieldType;
    const description = (field.description as string) ?? "";
    params.push({ name, type: innerType, required: !isOptional, description });
  }
  return params;
}

function extractToolInfo(
  tools: Record<string, Record<string, unknown>>,
  categories: Record<string, { category: string; conditional?: string }>,
): ToolInfo[] {
  const result: ToolInfo[] = [];
  for (const [name, toolObj] of Object.entries(tools)) {
    const meta = categories[name];
    const isProvider = toolObj.type === "provider";
    result.push({
      name,
      description: (toolObj.description as string) ?? (meta ? `${meta.category} provider tool` : "Provider-managed tool"),
      parameters: isProvider ? [] : extractZodParams(toolObj.inputSchema),
      category: meta?.category ?? "Uncategorized",
      conditional: meta?.conditional,
      isProviderTool: isProvider,
    });
  }
  return result;
}

/**
 * Build the same payload that `/chat-debug` shows, without needing a Better Auth session.
 * Pass any user id (typically the first admin) — preferences only affect the
 * `userDefaultModel` field.
 */
export async function buildChatDebugData(userId: string): Promise<ChatDebugData> {
  const prefs = await getUserPreferences(userId);
  const userDefaultModel: ChatModel = prefs.defaultChatModel ?? DEFAULT_CHAT_MODEL;

  const emptyPluginPrefs = { ...prefs, enabledPlugins: [] };
  const coreTools = createAiTools("claude-sonnet-4-6", userId, "debug-introspection", prefs.timezone, emptyPluginPrefs);
  const categories = getToolCategories();

  const allPluginTools = getAllPluginTools(userId, "debug-introspection", prefs.timezone);
  const plugins = getRegisteredPlugins(prefs);

  const pluginCategories: Record<string, { category: string; conditional?: string }> = {};
  for (const plugin of plugins) {
    for (const toolName of Object.keys(allPluginTools)) {
      if (toolName.startsWith(`${plugin.id}_`)) {
        pluginCategories[toolName] = {
          category: `Plugin: ${plugin.name}`,
          conditional: plugin.enabled ? undefined : "Plugin not enabled",
        };
      }
    }
  }

  const [skills, subAgents] = await Promise.all([readAllSkills(), readAllSubAgents()]);

  const models: ModelInfo[] = CHAT_MODELS.map((m) => ({ ...m, isDefault: m.id === DEFAULT_CHAT_MODEL }));

  const coreToolInfos = extractToolInfo(coreTools as unknown as Record<string, Record<string, unknown>>, categories);
  const pluginToolInfos = extractToolInfo(
    allPluginTools as unknown as Record<string, Record<string, unknown>>,
    pluginCategories,
  );

  const exaCategories: Record<string, { category: string; conditional?: string }> = {
    web_search: { category: "Web (Exa)", conditional: "OpenRouter models only (webToolVersion = 'none')" },
    web_fetch: { category: "Web (Exa)", conditional: "OpenRouter models only (webToolVersion = 'none')" },
  };
  const { exaTools } = await import("#/lib/tools/exa-tools");
  const exaInfos = extractToolInfo(exaTools as unknown as Record<string, Record<string, unknown>>, exaCategories);
  for (const info of exaInfos) {
    info.name = `${info.name} (exa)`;
  }

  return {
    models,
    defaultModel: DEFAULT_CHAT_MODEL,
    userDefaultModel,
    effortLevels: CHAT_EFFORT_LEVELS,
    defaultEffort: DEFAULT_CHAT_EFFORT,
    tools: [...coreToolInfos, ...exaInfos, ...pluginToolInfos],
    skills: skills.map(({ body: _, ...rest }) => rest),
    subAgents: subAgents.map(({ body: _, ...rest }) => rest),
    plugins,
    config: {
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
      hasObsidianDir: !!OBSIDIAN_DIR,
      obsidianDir: OBSIDIAN_DIR || "(not set)",
      hasExaKey: !!process.env.EXA_API_KEY,
      maxToolSteps: 10,
    },
  };
}
