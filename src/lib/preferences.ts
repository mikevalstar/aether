export type UserPreferences = {
	obsidianTemplatesFolder?: string;
	pushoverUserKey?: string;
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
