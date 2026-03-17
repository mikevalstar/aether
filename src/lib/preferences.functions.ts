import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { prisma } from "#/db";
import { auth } from "#/lib/auth";
import { ensureSession } from "#/lib/auth.functions";
import { searchVault } from "#/lib/obsidian/vault-index";
import { listObsidianFolders } from "#/lib/obsidian.functions";
import { parsePreferences, serializePreferences, type UserPreferences } from "#/lib/preferences";

type UpdateProfileInput = {
	name: string;
};

type UpdatePreferencesInput = Partial<UserPreferences>;

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
	.inputValidator((data: UpdateProfileInput) => {
		const name = data.name.trim();
		if (!name) {
			throw new Error("Name is required");
		}
		return { name };
	})
	.handler(async ({ data }) => {
		await ensureSession();

		await auth.api.updateUser({
			headers: getRequestHeaders(),
			body: { name: data.name },
		});

		return { success: true };
	});

export const updateUserPreferences = createServerFn({ method: "POST" })
	.inputValidator((data: UpdatePreferencesInput) => data)
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

type SearchVaultFilesInput = { query: string };

export const searchVaultFiles = createServerFn({ method: "GET" })
	.inputValidator((data: SearchVaultFilesInput) => data)
	.handler(async ({ data }) => {
		await ensureSession();
		const results = await searchVault(data.query, 20);
		return results.map((r) => ({
			path: r.item.relativePath,
			title: r.item.title,
		}));
	});
