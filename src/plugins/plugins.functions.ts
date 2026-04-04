import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "#/db";
import { ensureSession } from "#/lib/auth.functions";
import { parsePreferences, serializePreferences } from "#/lib/preferences";
import { getPlugin, plugins } from "#/plugins";

const pluginIdSchema = z
  .string()
  .trim()
  .min(1, "Plugin ID is required")
  .refine((pluginId) => plugins.some((plugin) => plugin.meta.id === pluginId), {
    message: "Unknown plugin",
  });

const pluginOptionsSchema = z.record(z.string(), z.unknown());

const togglePluginInputSchema = z.object({
  pluginId: pluginIdSchema,
  enabled: z.boolean(),
});

const pluginIdInputSchema = z.object({
  pluginId: pluginIdSchema,
});

const pluginOptionsInputSchema = z.object({
  pluginId: pluginIdSchema,
  options: pluginOptionsSchema,
});

const imapConnectionOptionsSchema = z
  .object({
    host: z.string().trim().min(1).default("127.0.0.1"),
    port: z.coerce.number().int().positive().default(1143),
    username: z.string().default(""),
    password: z.string().default(""),
    tls: z.coerce.boolean().default(false),
  })
  .passthrough();

const sonarrConnectionOptionsSchema = z
  .object({
    base_url: z.string().trim().min(1).default("http://localhost:8989"),
    api_key: z.string().default(""),
  })
  .passthrough();

const apiBalancesConnectionOptionsSchema = z
  .object({
    openrouter_enabled: z.coerce.boolean().default(false),
    openrouter_api_key: z.string().optional(),
    openai_enabled: z.coerce.boolean().default(false),
    openai_api_key: z.string().optional(),
    kilo_enabled: z.coerce.boolean().default(false),
    kilo_api_key: z.string().optional(),
  })
  .passthrough();

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
  .inputValidator((data) => togglePluginInputSchema.parse(data))
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
  .inputValidator((data) => pluginOptionsInputSchema.parse(data))
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
  .inputValidator((data) => pluginIdInputSchema.parse(data))
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
  .inputValidator((data) => pluginIdInputSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();
    const { checkPluginHealth } = await import("#/plugins/index.server");
    return await checkPluginHealth(data.pluginId, session.user.id);
  });

export const testPluginConnection = createServerFn({ method: "POST" })
  .inputValidator((data) => pluginOptionsInputSchema.parse(data))
  .handler(async ({ data }) => {
    await ensureSession();

    if (data.pluginId === "imap_email") {
      const { testConnection } = await import("#/plugins/imap_email/lib/imap-client");
      const options = imapConnectionOptionsSchema.parse(data.options);
      return await testConnection({
        host: options.host,
        port: options.port,
        username: options.username,
        password: options.password,
        tls: options.tls,
      });
    }

    if (data.pluginId === "api_balances") {
      const { testApiBalancesConnection } = await import("#/plugins/api_balances/lib/test-connection");
      const options = apiBalancesConnectionOptionsSchema.parse(data.options);
      return await testApiBalancesConnection(options);
    }

    if (data.pluginId === "sonarr") {
      const { testConnection } = await import("#/plugins/sonarr/lib/sonarr-client");
      const options = sonarrConnectionOptionsSchema.parse(data.options);
      return await testConnection({ base_url: options.base_url, api_key: options.api_key });
    }

    return { success: false, message: "No test available for this plugin" };
  });
