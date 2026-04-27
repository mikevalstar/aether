import { createServerFn } from "@tanstack/react-start";
import { ensureSession } from "#/lib/auth.functions";
import { listOpenRouterCatalog, type OpenRouterCatalogModel } from "#/lib/chat/openrouter-catalog";

export type { OpenRouterCatalogModel };

export const listOpenRouterModels = createServerFn({ method: "GET" }).handler(
  async (): Promise<OpenRouterCatalogModel[]> => {
    await ensureSession();
    return listOpenRouterCatalog();
  },
);
