import { createServerFn } from "@tanstack/react-start";
import { prisma } from "#/db";
import { ensureSession } from "#/lib/auth.functions";
import { parsePreferences } from "#/lib/preferences";
import { getEnabledPlugins } from "#/plugins";

export type PluginWidgetInfo = {
  pluginId: string;
  pluginName: string;
  widgets: Array<{
    id: string;
    label: string;
    size: "half" | "full";
  }>;
  // biome-ignore lint/suspicious/noExplicitAny: serialization boundary requires any
  data: Record<string, any>;
  // biome-ignore lint/suspicious/noExplicitAny: serialization boundary requires any
  options: Record<string, any>;
};

export const loadDashboardPluginWidgets = createServerFn({ method: "GET" }).handler(
  async (): Promise<PluginWidgetInfo[]> => {
    const session = await ensureSession();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    });
    const prefs = parsePreferences(user?.preferences);
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
