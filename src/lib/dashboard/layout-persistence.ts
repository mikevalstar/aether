import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureSession } from "#/lib/auth.functions";
import { getUserPreference, setUserPreference } from "#/lib/preferences.server";

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
    await setUserPreference(session.user.id, "dashboardLayouts", data.layouts);

    return { success: true };
  });

export const loadDashboardLayout = createServerFn({ method: "GET" }).handler(async () => {
  const session = await ensureSession();
  return (await getUserPreference(session.user.id, "dashboardLayouts")) ?? null;
});
