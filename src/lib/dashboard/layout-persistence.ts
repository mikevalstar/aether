import { createServerFn } from "@tanstack/react-start";
import { prisma } from "#/db";
import { ensureSession } from "#/lib/auth.functions";
import { parsePreferences, serializePreferences } from "#/lib/preferences";

/** Serializable layout item (subset of LayoutItem without functions) */
type SerializableLayoutItem = { i: string; x: number; y: number; w: number; h: number };
type SerializableLayouts = Record<string, SerializableLayoutItem[]>;

export const saveDashboardLayout = createServerFn({ method: "POST" })
  .inputValidator((data: { layouts: SerializableLayouts }) => data)
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    });

    const current = parsePreferences(user?.preferences);
    const merged = { ...current, dashboardLayouts: data.layouts };

    await prisma.user.update({
      where: { id: session.user.id },
      data: { preferences: serializePreferences(merged) },
    });

    return { success: true };
  });

export const loadDashboardLayout = createServerFn({ method: "GET" }).handler(async () => {
  const session = await ensureSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferences: true },
  });
  const prefs = parsePreferences(user?.preferences);
  return prefs.dashboardLayouts ?? null;
});
