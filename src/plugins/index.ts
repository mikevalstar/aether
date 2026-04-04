import type { UserPreferences } from "#/lib/preferences";
import { apiBalancesPlugin } from "./api_balances";
import { imapPlugin } from "./imap_email";
import { sonarrPlugin } from "./sonarr";
import type { AetherPlugin, PluginActivityType } from "./types";

/** All registered plugins (client-safe — no server imports). */
export const plugins: AetherPlugin[] = [imapPlugin, apiBalancesPlugin, sonarrPlugin];

export function getPlugin(id: string): AetherPlugin | undefined {
  return plugins.find((p) => p.meta.id === id);
}

export function getEnabledPlugins(prefs: UserPreferences): AetherPlugin[] {
  const enabled = prefs.enabledPlugins ?? [];
  return plugins.filter((p) => enabled.includes(p.meta.id));
}

export function getPluginActivityTypes(prefs: UserPreferences): PluginActivityType[] {
  const enabled = getEnabledPlugins(prefs);
  return enabled.flatMap((p) =>
    (p.activityTypes ?? []).map((at) => ({
      ...at,
      type: `plugin:${p.meta.id}:${at.type}`,
    })),
  );
}
