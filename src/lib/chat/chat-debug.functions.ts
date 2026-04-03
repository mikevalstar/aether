import { createServerFn } from "@tanstack/react-start";
import { prisma } from "#/db";
import { createAiTools, getToolCategories } from "#/lib/ai-tools";
import { ensureSession } from "#/lib/auth.functions";
import {
  CHAT_EFFORT_LEVELS,
  CHAT_MODELS,
  type ChatModel,
  DEFAULT_CHAT_EFFORT,
  DEFAULT_CHAT_MODEL,
} from "#/lib/chat/chat-models";
import { OBSIDIAN_DIR } from "#/lib/obsidian/obsidian";
import { parsePreferences } from "#/lib/preferences";
import { readAllSkills, type SkillSummary } from "#/lib/skills";
import { getAllPluginTools, getRegisteredPlugins } from "#/plugins/index.server";

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

/** Extract parameter info from a Zod schema shape. */
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

    params.push({
      name,
      type: innerType,
      required: !isOptional,
      description,
    });
  }
  return params;
}

/** Extract ToolInfo from live tool objects. */
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

export const getChatDebugData = createServerFn({ method: "GET" }).handler(async (): Promise<ChatDebugData> => {
  const session = await ensureSession();

  // Load user preferences for default model + to pass to createAiTools
  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferences: true },
  });
  const prefs = parsePreferences(userRecord?.preferences);
  const userDefaultModel: ChatModel = prefs.defaultChatModel ?? DEFAULT_CHAT_MODEL;

  // Build the core tool set using Sonnet (widest: code_execution + latest web tools)
  // Pass empty prefs for plugins — we'll load ALL plugin tools separately below
  const emptyPluginPrefs = { ...prefs, enabledPlugins: [] };
  const coreTools = createAiTools(
    "claude-sonnet-4-6",
    session.user.id,
    "debug-introspection",
    prefs.timezone,
    emptyPluginPrefs,
  );
  const categories = getToolCategories();

  // Load ALL plugin tools regardless of enabled state
  const allPluginTools = getAllPluginTools(session.user.id, "debug-introspection", prefs.timezone);
  const plugins = getRegisteredPlugins(prefs);

  // Build plugin category map: plugin tools get categorized under "Plugin: <name>"
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

  const skills = await readAllSkills();

  const models: ModelInfo[] = CHAT_MODELS.map((m) => ({
    ...m,
    isDefault: m.id === DEFAULT_CHAT_MODEL,
  }));

  const coreToolInfos = extractToolInfo(coreTools as unknown as Record<string, Record<string, unknown>>, categories);
  const pluginToolInfos = extractToolInfo(
    allPluginTools as unknown as Record<string, Record<string, unknown>>,
    pluginCategories,
  );

  // Also add Exa tools (not included when using Sonnet) and note them as conditional
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
});
