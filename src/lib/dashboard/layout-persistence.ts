import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "#/db";
import { ensureSession } from "#/lib/auth.functions";
import { parsePreferences, serializePreferences } from "#/lib/preferences";

const dashboardLayoutItemSchema = z
  .object({
    i: z.string().trim().min(1),
    x: z.coerce.number().int().min(0),
    y: z.coerce.number().int().min(0),
    w: z.coerce.number().int().min(1),
    h: z.coerce.number().int().min(1),
  })
  .strict();

const saveDashboardLayoutInputSchema = z
  .object({
    layouts: z.record(z.string(), z.array(dashboardLayoutItemSchema)),
  })
  .strict();

export const saveDashboardLayout = createServerFn({ method: "POST" })
  .inputValidator((data) => saveDashboardLayoutInputSchema.parse(data))
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
