import type { CalendarFeed } from "#/lib/calendar/types";
import type { ChatModel } from "#/lib/chat-models";

export type UserPreferences = {
  obsidianTemplatesFolder?: string;
  pushoverUserKey?: string;
  calendarFeeds?: CalendarFeed[];
  kanbanFile?: string;
  timezone?: string;
  defaultChatModel?: ChatModel;
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
