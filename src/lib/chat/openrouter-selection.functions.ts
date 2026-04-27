import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "#/db";
import { ensureSession } from "#/lib/auth.functions";
import { listOpenRouterCatalog } from "#/lib/chat/openrouter-catalog";

export type SelectedOpenRouterModel = {
  id: string;
  modelId: string;
  label: string;
  description: string | null;
  inputCostPerMillionTokensUsd: number | null;
  outputCostPerMillionTokensUsd: number | null;
  contextLength: number | null;
  addedAt: string;
};

export const listSelectedOpenRouterModels = createServerFn({ method: "GET" }).handler(
  async (): Promise<SelectedOpenRouterModel[]> => {
    const session = await ensureSession();
    const rows = await prisma.userSelectedModel.findMany({
      where: { userId: session.user.id, provider: "openrouter" },
      orderBy: { addedAt: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      modelId: r.modelId,
      label: r.label,
      description: r.description,
      inputCostPerMillionTokensUsd: r.inputCostPerMillionTokensUsd,
      outputCostPerMillionTokensUsd: r.outputCostPerMillionTokensUsd,
      contextLength: r.contextLength,
      addedAt: r.addedAt.toISOString(),
    }));
  },
);

const modelIdInput = z.object({ modelId: z.string().trim().min(1) }).strict();

export const addOpenRouterModel = createServerFn({ method: "POST" })
  .inputValidator((data) => modelIdInput.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();
    const catalog = await listOpenRouterCatalog();
    const entry = catalog.find((m) => m.id === data.modelId);
    if (!entry) {
      throw new Error(`Model "${data.modelId}" not found in OpenRouter catalog`);
    }
    await prisma.userSelectedModel.upsert({
      where: {
        userId_provider_modelId: {
          userId: session.user.id,
          provider: "openrouter",
          modelId: entry.id,
        },
      },
      update: {
        label: entry.label,
        description: entry.description,
        inputCostPerMillionTokensUsd: entry.inputCostPerMillionTokensUsd,
        outputCostPerMillionTokensUsd: entry.outputCostPerMillionTokensUsd,
        contextLength: entry.contextLength,
        supportsEffort: entry.supportsEffort,
      },
      create: {
        userId: session.user.id,
        provider: "openrouter",
        modelId: entry.id,
        label: entry.label,
        description: entry.description,
        inputCostPerMillionTokensUsd: entry.inputCostPerMillionTokensUsd,
        outputCostPerMillionTokensUsd: entry.outputCostPerMillionTokensUsd,
        contextLength: entry.contextLength,
        supportsEffort: entry.supportsEffort,
      },
    });
    return { ok: true };
  });

export const refreshOpenRouterPrices = createServerFn({ method: "POST" }).handler(async () => {
  const session = await ensureSession();
  const catalog = await listOpenRouterCatalog({ force: true });
  if (catalog.length === 0) {
    throw new Error("OpenRouter catalog is empty — refresh failed");
  }
  const catalogById = new Map(catalog.map((m) => [m.id, m]));
  const rows = await prisma.userSelectedModel.findMany({
    where: { userId: session.user.id, provider: "openrouter" },
  });

  let updated = 0;
  let missing = 0;
  for (const row of rows) {
    const fresh = catalogById.get(row.modelId);
    if (!fresh) {
      missing += 1;
      continue;
    }
    await prisma.userSelectedModel.update({
      where: { id: row.id },
      data: {
        label: fresh.label,
        description: fresh.description,
        inputCostPerMillionTokensUsd: fresh.inputCostPerMillionTokensUsd,
        outputCostPerMillionTokensUsd: fresh.outputCostPerMillionTokensUsd,
        contextLength: fresh.contextLength,
        supportsEffort: fresh.supportsEffort,
      },
    });
    updated += 1;
  }
  return { updated, missing, total: rows.length };
});

export const removeOpenRouterModel = createServerFn({ method: "POST" })
  .inputValidator((data) => modelIdInput.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();
    await prisma.userSelectedModel.deleteMany({
      where: {
        userId: session.user.id,
        provider: "openrouter",
        modelId: data.modelId,
      },
    });
    return { ok: true };
  });
