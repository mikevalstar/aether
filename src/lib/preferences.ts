import { z } from "zod";
import type { CalendarFeed } from "#/lib/calendar/types";
import type { ChatModel } from "#/lib/chat/chat-models";
import { CHAT_MODELS } from "#/lib/chat/chat-models";

export type UserPreferences = {
  obsidianTemplatesFolder?: string;
  pushoverUserKey?: string;
  pushNotificationMinLevel?: "info" | "low" | "medium" | "high" | "critical";
  calendarFeeds?: CalendarFeed[];
  kanbanFile?: string;
  dashboardBoardColumn?: string;
  timezone?: string;
  defaultChatModel?: ChatModel;
  enabledPlugins?: string[];
  // biome-ignore lint: plugin options are flexible JSON
  pluginOptions?: Record<string, Record<string, any>>;
  dashboardLayouts?: Record<string, Array<{ i: string; x: number; y: number; w: number; h: number }>>;
  obsidianChatExportFolder?: string;
};

export type UserPreferencesPatch = Partial<UserPreferences>;
export type UserPreferenceKey = keyof UserPreferences;

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

export const userPreferencesSchema = z
  .object({
    obsidianTemplatesFolder: z.string().trim().optional(),
    pushoverUserKey: z.string().trim().optional(),
    pushNotificationMinLevel: z.enum(["info", "low", "medium", "high", "critical"]).optional(),
    calendarFeeds: z.array(calendarFeedSchema).optional(),
    kanbanFile: z.string().trim().optional(),
    dashboardBoardColumn: z.string().trim().optional(),
    timezone: z.string().trim().optional(),
    defaultChatModel: z.enum(chatModelIds).optional(),
    enabledPlugins: z.array(z.string().trim().min(1)).optional(),
    pluginOptions: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
    dashboardLayouts: z.record(z.string(), z.array(dashboardLayoutItemSchema)).optional(),
    obsidianChatExportFolder: z.string().trim().optional(),
  })
  .passthrough();

export const userPreferencesPatchSchema = userPreferencesSchema.partial();

export function parsePreferences(raw: string | null | undefined): UserPreferences {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    const result = userPreferencesSchema.safeParse(parsed);
    return result.success ? (result.data as UserPreferences) : {};
  } catch {
    return {};
  }
}

export function serializePreferences(prefs: UserPreferences): string {
  const result = userPreferencesSchema.safeParse(prefs);
  return JSON.stringify(result.success ? result.data : {});
}
