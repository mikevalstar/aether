import { createServerFn } from "@tanstack/react-start";
import { prisma } from "#/db";
import { ensureSession } from "#/lib/auth.functions";
import { toObsidianRoutePath } from "#/lib/obsidian/obsidian";
import { searchVault } from "#/lib/obsidian/vault-index";
import { queryInputSchema } from "#/lib/shared-schemas";

export type CommandPaletteWorkflow = {
  filename: string;
  title: string;
};

export const getCommandPaletteWorkflows = createServerFn({ method: "GET" }).handler(async () => {
  await ensureSession();

  const rows = await prisma.workflow.findMany({
    where: { fileExists: true },
    orderBy: { title: "asc" },
    select: { filename: true, title: true },
  });

  return rows as CommandPaletteWorkflow[];
});

export type CommandPaletteObsidianResult = {
  title: string;
  folder: string;
  routePath: string;
};

export const searchCommandPaletteObsidian = createServerFn({ method: "GET" })
  .inputValidator((data) => queryInputSchema.parse(data))
  .handler(async ({ data }): Promise<CommandPaletteObsidianResult[]> => {
    await ensureSession();

    if (!data.query.trim()) return [];

    const results = await searchVault(data.query, 10);

    return results.map((r) => ({
      title: r.item.title,
      folder: r.item.folder,
      routePath: toObsidianRoutePath(r.item.relativePath),
    }));
  });
