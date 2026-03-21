import { createServerFn } from "@tanstack/react-start";
import { prisma } from "#/db";
import { ensureSession } from "#/lib/auth.functions";
import { parsePreferences, serializePreferences } from "#/lib/preferences";
import { getPlugin, plugins } from "#/plugins";

export const getPluginsPageData = createServerFn({ method: "GET" }).handler(async () => {
  const session = await ensureSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferences: true },
  });
  const prefs = parsePreferences(user?.preferences);
  const enabledPlugins = prefs.enabledPlugins ?? [];
  const pluginOptions = prefs.pluginOptions ?? {};

  return {
    plugins: plugins.map((p) => ({
      id: p.meta.id,
      name: p.meta.name,
      description: p.meta.description,
      version: p.meta.version,
      enabled: enabledPlugins.includes(p.meta.id),
      hasHealthCheck: p.meta.hasHealthCheck ?? false,
      optionFields: p.optionFields ?? [],
    })),
    enabledPlugins,
    pluginOptions,
  };
});

export const togglePlugin = createServerFn({ method: "POST" })
  .inputValidator((data: { pluginId: string; enabled: boolean }) => data)
  .handler(async ({ data }) => {
    const session = await ensureSession();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    });
    const prefs = parsePreferences(user?.preferences);
    const current = prefs.enabledPlugins ?? [];

    const updated = data.enabled ? [...new Set([...current, data.pluginId])] : current.filter((id) => id !== data.pluginId);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        preferences: serializePreferences({ ...prefs, enabledPlugins: updated }),
      },
    });

    return { success: true };
  });

export const savePluginOptions = createServerFn({ method: "POST" })
  .inputValidator((data: { pluginId: string; options: Record<string, any> }) => data)
  .handler(async ({ data }) => {
    const session = await ensureSession();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    });
    const prefs = parsePreferences(user?.preferences);
    const pluginOptions = { ...prefs.pluginOptions, [data.pluginId]: data.options };

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        preferences: serializePreferences({ ...prefs, pluginOptions }),
      },
    });

    return { success: true };
  });

export const getPluginOptions = createServerFn({ method: "GET" })
  .inputValidator((data: { pluginId: string }) => data)
  .handler(async ({ data }) => {
    const session = await ensureSession();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    });
    const prefs = parsePreferences(user?.preferences);
    const plugin = getPlugin(data.pluginId);

    return {
      options: prefs.pluginOptions?.[data.pluginId] ?? {},
      optionFields: plugin?.optionFields ?? [],
      pluginName: plugin?.meta.name ?? data.pluginId,
      enabled: (prefs.enabledPlugins ?? []).includes(data.pluginId),
    };
  });

export const checkPluginHealthFn = createServerFn({ method: "GET" })
  .inputValidator((data: { pluginId: string }) => data)
  .handler(async ({ data }) => {
    const session = await ensureSession();
    const { checkPluginHealth } = await import("#/plugins/index.server");
    return await checkPluginHealth(data.pluginId, session.user.id);
  });

export const testPluginConnection = createServerFn({ method: "POST" })
  .inputValidator((data: { pluginId: string; options: Record<string, any> }) => data)
  .handler(async ({ data }) => {
    await ensureSession();

    if (data.pluginId === "imap_email") {
      const { testConnection } = await import("#/plugins/imap_email/lib/imap-client");
      return await testConnection({
        host: (data.options.host as string) ?? "127.0.0.1",
        port: (data.options.port as number) ?? 1143,
        username: (data.options.username as string) ?? "",
        password: (data.options.password as string) ?? "",
        tls: (data.options.tls as boolean) ?? false,
      });
    }

    return { success: false, message: "No test available for this plugin" };
  });
