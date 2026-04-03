import type { CalendarFeed } from "#/lib/calendar/types";
import type { ChatModel } from "#/lib/chat-models";

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

export function parsePreferences(raw: string | null | undefined): UserPreferences {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as UserPreferences;
  } catch {
    return {};
  }
}

export function serializePreferences(prefs: UserPreferences): string {
  return JSON.stringify(prefs);
}
