import type { ToolSet } from "ai";
import type { UserPreferences } from "#/lib/preferences";
import { imapPluginFull } from "./imap_email/index.server";
import { createPluginContext } from "./plugin-context";
import type { AetherPlugin } from "./types";

/** All registered plugins with full server capabilities. */
const serverPlugins: AetherPlugin[] = [imapPluginFull];

function getServerPlugin(id: string): AetherPlugin | undefined {
  return serverPlugins.find((p) => p.meta.id === id);
}

function getEnabledServerPlugins(prefs: UserPreferences): AetherPlugin[] {
  const enabled = prefs.enabledPlugins ?? [];
  return serverPlugins.filter((p) => enabled.includes(p.meta.id));
}

export function getPluginTools(
  userId: string,
  threadId: string,
  timezone: string | undefined,
  prefs: UserPreferences,
): ToolSet {
  const enabled = getEnabledServerPlugins(prefs);
  const tools: ToolSet = {};

  for (const plugin of enabled) {
    if (!plugin.server?.createTools) continue;
    const ctx = createPluginContext(plugin.meta.id, userId, threadId, timezone);
    const pluginTools = plugin.server.createTools(ctx);
    for (const [name, tool] of Object.entries(pluginTools)) {
      tools[`${plugin.meta.id}_${name}`] = tool;
    }
  }

  return tools;
}

export function getPluginSystemPrompts(prefs: UserPreferences): string[] {
  const enabled = getEnabledServerPlugins(prefs);
  return enabled.map((p) => p.server?.systemPrompt).filter((s): s is string => !!s);
}

export async function getPluginWidgetData(
  userId: string,
  prefs: UserPreferences,
): Promise<Record<string, Record<string, unknown>>> {
  const enabled = getEnabledServerPlugins(prefs);
  const results: Record<string, Record<string, unknown>> = {};

  await Promise.all(
    enabled
      .filter((p) => p.server?.loadWidgetData && p.client?.widgets?.length)
      .map(async (p) => {
        try {
          const ctx = createPluginContext(p.meta.id, userId);
          results[p.meta.id] = await p.server!.loadWidgetData!(ctx);
        } catch {
          results[p.meta.id] = { error: true };
        }
      }),
  );

  return results;
}

export async function checkPluginHealth(
  pluginId: string,
  userId: string,
): Promise<{ status: "ok" | "error" | "warning"; message?: string }> {
  const plugin = getServerPlugin(pluginId);
  if (!plugin?.server?.checkHealth) {
    return { status: "ok", message: "No health check" };
  }
  try {
    const ctx = createPluginContext(pluginId, userId);
    return await plugin.server.checkHealth(ctx);
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Unknown error" };
  }
}
