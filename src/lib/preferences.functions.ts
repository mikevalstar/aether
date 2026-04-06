import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "#/db";
import { auth } from "#/lib/auth";
import { ensureSession } from "#/lib/auth.functions";
import { listObsidianFolders } from "#/lib/obsidian/obsidian.functions";
import { searchVault } from "#/lib/obsidian/vault-index";
import { userPreferencesPatchSchema } from "#/lib/preferences";
import { getUserPreferences, patchUserPreferences } from "#/lib/preferences.server";
import { queryInputSchema } from "#/lib/shared-schemas";

const updateProfileInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
  })
  .strict();

export const getPreferencesPageData = createServerFn({
  method: "GET",
}).handler(async () => {
  const session = await ensureSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
    },
  });

  if (!user) {
    throw new Error("Not found");
  }

  const obsidianFolders = await listObsidianFolders().catch(() => [] as string[]);

  return {
    name: user.name,
    email: user.email,
    preferences: await getUserPreferences(session.user.id),
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
  .inputValidator((data) => userPreferencesPatchSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();
    await patchUserPreferences(session.user.id, data);

    return { success: true };
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
