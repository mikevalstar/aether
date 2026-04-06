import { prisma } from "#/db";
import {
  parsePreferences,
  serializePreferences,
  type UserPreferenceKey,
  type UserPreferences,
  type UserPreferencesPatch,
} from "#/lib/preferences";

async function readStoredPreferences(userId: string): Promise<UserPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  return parsePreferences(user?.preferences);
}

function normalizePreferences(preferences: UserPreferences): UserPreferences {
  return parsePreferences(serializePreferences(preferences));
}

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  return readStoredPreferences(userId);
}

export async function getUserPreference<K extends UserPreferenceKey>(
  userId: string,
  key: K,
): Promise<UserPreferences[K] | undefined> {
  const preferences = await getUserPreferences(userId);
  return preferences[key];
}

export async function updateUserPreferencesWith(
  userId: string,
  updater: (current: UserPreferences) => UserPreferences,
): Promise<UserPreferences> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });
    const current = parsePreferences(user?.preferences);
    const next = normalizePreferences(updater(current));

    await tx.user.update({
      where: { id: userId },
      data: { preferences: serializePreferences(next) },
    });

    return next;
  });
}

export async function patchUserPreferences(userId: string, patch: UserPreferencesPatch): Promise<UserPreferences> {
  return updateUserPreferencesWith(userId, (current) => ({ ...current, ...patch }));
}

export async function setUserPreference<K extends UserPreferenceKey>(
  userId: string,
  key: K,
  value: UserPreferences[K] | undefined,
): Promise<UserPreferences> {
  return updateUserPreferencesWith(userId, (current) => {
    if (value === undefined) {
      const next = { ...current };
      delete next[key];
      return next;
    }

    return { ...current, [key]: value };
  });
}

export async function getUserTimezone(userId: string): Promise<string | undefined> {
  return getUserPreference(userId, "timezone");
}

// biome-ignore lint/suspicious/noExplicitAny: plugin option values are flexible JSON
export async function getUserPluginOptions<T extends Record<string, any> = Record<string, any>>(
  userId: string,
  pluginId: string,
): Promise<T> {
  const pluginOptions = await getUserPreference(userId, "pluginOptions");
  return ((pluginOptions?.[pluginId] as T | undefined) ?? {}) as T;
}

export async function setUserPluginOptions(
  userId: string,
  pluginId: string,
  options: Record<string, unknown>,
): Promise<UserPreferences> {
  return updateUserPreferencesWith(userId, (current) => ({
    ...current,
    pluginOptions: {
      ...(current.pluginOptions ?? {}),
      [pluginId]: options,
    },
  }));
}

export async function setUserPluginEnabled(userId: string, pluginId: string, enabled: boolean): Promise<UserPreferences> {
  return updateUserPreferencesWith(userId, (current) => {
    const existing = current.enabledPlugins ?? [];
    const enabledPlugins = enabled ? [...new Set([...existing, pluginId])] : existing.filter((value) => value !== pluginId);

    return { ...current, enabledPlugins };
  });
}
