import type { PluginClientContext } from "./types";

/**
 * Create a minimal PluginClientContext for rendering widgets.
 * Obsidian and activity functions are stubs — widgets should use
 * server-loaded data from loadWidgetData() instead.
 */
export function createPluginClientContextFromOptions(
  pluginId: string,
  options: Record<string, unknown>,
): PluginClientContext {
  return {
    pluginId,
    options,
    obsidian: {
      read: async () => null,
      write: async () => {},
      list: async () => [],
      search: async () => [],
    },
    logActivity: async () => {},
  };
}
