import { createServerFn } from "@tanstack/react-start";
import { ensureSession } from "#/lib/auth.functions";
import { getUserPreferences } from "#/lib/preferences.server";
import { getEnabledPlugins } from "#/plugins";

export type PluginWidgetInfo = {
  pluginId: string;
  pluginName: string;
  widgets: Array<{
    id: string;
    label: string;
    size: "quarter" | "half" | "three-quarter" | "full";
  }>;
  // biome-ignore lint/suspicious/noExplicitAny: serialization boundary requires any
  data: Record<string, any>;
  // biome-ignore lint/suspicious/noExplicitAny: serialization boundary requires any
  options: Record<string, any>;
};

export const loadDashboardPluginWidgets = createServerFn({ method: "GET" }).handler(
  async (): Promise<PluginWidgetInfo[]> => {
    const session = await ensureSession();
    const prefs = await getUserPreferences(session.user.id);
    const enabled = getEnabledPlugins(prefs);
    const pluginsWithWidgets = enabled.filter((p) => p.client?.widgets?.length);

    if (pluginsWithWidgets.length === 0) return [];

    // Dynamic import to avoid bundling server code into client
    const { getPluginWidgetData } = await import("#/plugins/index.server");
    const widgetData = await getPluginWidgetData(session.user.id, prefs);

    return pluginsWithWidgets.map((p) => ({
      pluginId: p.meta.id,
      pluginName: p.meta.name,
      widgets: (p.client?.widgets ?? []).map((w) => ({
        id: w.id,
        label: w.label,
        size: w.size,
      })),
      data: widgetData[p.meta.id] ?? {},
      options: prefs.pluginOptions?.[p.meta.id] ?? {},
    }));
  },
);
