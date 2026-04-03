import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "#/db";
import { auth } from "#/lib/auth";
import { ensureSession } from "#/lib/auth.functions";
import { CHAT_MODELS, type ChatModel } from "#/lib/chat/chat-models";
import { listObsidianFolders } from "#/lib/obsidian/obsidian.functions";
import { searchVault } from "#/lib/obsidian/vault-index";
import { parsePreferences, serializePreferences } from "#/lib/preferences";
import { queryInputSchema } from "#/lib/shared-schemas";

const chatModelIds = CHAT_MODELS.map((model) => model.id) as [ChatModel, ...ChatModel[]];

const calendarFeedSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    url: z.string().trim().min(1),
    color: z.string().trim().min(1),
    syncInterval: z.coerce.number().int().min(1),
  })
  .strict();

const dashboardLayoutItemSchema = z
  .object({
    i: z.string().trim().min(1),
    x: z.coerce.number().int().min(0),
    y: z.coerce.number().int().min(0),
    w: z.coerce.number().int().min(1),
    h: z.coerce.number().int().min(1),
  })
  .strict();

const updateProfileInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
  })
  .strict();

const updatePreferencesInputSchema = z
  .object({
    obsidianTemplatesFolder: z.string().trim().optional(),
    pushoverUserKey: z.string().trim().optional(),
    calendarFeeds: z.array(calendarFeedSchema).optional(),
    kanbanFile: z.string().trim().optional(),
    dashboardBoardColumn: z.string().trim().optional(),
    timezone: z.string().trim().optional(),
    defaultChatModel: z.enum(chatModelIds).optional(),
    enabledPlugins: z.array(z.string().trim().min(1)).optional(),
    pluginOptions: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
    dashboardLayouts: z.record(z.string(), z.array(dashboardLayoutItemSchema)).optional(),
    obsidianChatExportFolder: z.string().trim().optional(),
    pushNotificationMinLevel: z.enum(["info", "low", "medium", "high", "critical"]).optional(),
  })
  .strict();

export const getPreferencesPageData = createServerFn({
  method: "GET",
}).handler(async () => {
  const session = await ensureSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      preferences: true,
    },
  });

  if (!user) {
    throw new Error("Not found");
  }

  const obsidianFolders = await listObsidianFolders().catch(() => [] as string[]);

  return {
    name: user.name,
    email: user.email,
    preferences: parsePreferences(user.preferences),
    obsidianFolders,
  };
});

export const updateUserProfile = createServerFn({ method: "POST" })
  .inputValidator((data) => updateProfileInputSchema.parse(data))
  .handler(async ({ data }) => {
    await ensureSession();

    await auth.api.updateUser({
      headers: getRequestHeaders(),
      body: { name: data.name },
    });

    return { success: true };
  });

export const updateUserPreferences = createServerFn({ method: "POST" })
  .inputValidator((data) => updatePreferencesInputSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    });

    const current = parsePreferences(user?.preferences);
    const merged = { ...current, ...data };

    await prisma.user.update({
      where: { id: session.user.id },
      data: { preferences: serializePreferences(merged) },
    });

    return { success: true };
  });

export const getDashboardBoardColumn = createServerFn({ method: "GET" }).handler(async () => {
  const session = await ensureSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferences: true },
  });
  const prefs = parsePreferences(user?.preferences);
  return prefs.dashboardBoardColumn ?? null;
});

export const searchVaultFiles = createServerFn({ method: "GET" })
  .inputValidator((data) => queryInputSchema.parse(data))
  .handler(async ({ data }) => {
    await ensureSession();
    const results = await searchVault(data.query, 20);
    return results.map((r) => ({
      path: r.item.relativePath,
      title: r.item.title,
    }));
  });
