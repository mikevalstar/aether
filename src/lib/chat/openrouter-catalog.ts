import { logger } from "#/lib/logger";

export type OpenRouterCatalogModel = {
  id: string;
  label: string;
  description: string;
  inputCostPerMillionTokensUsd: number | null;
  outputCostPerMillionTokensUsd: number | null;
  contextLength: number | null;
  supportsTools: boolean;
};

type OpenRouterApiModel = {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  supported_parameters?: string[];
};

const CACHE_TTL_MS = 60 * 60 * 1000;

let cache: { fetchedAt: number; models: OpenRouterCatalogModel[] } | null = null;
let inflight: Promise<OpenRouterCatalogModel[]> | null = null;

function parsePricePerToken(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  // OpenRouter sends per-token prices as strings like "0.0000005". Multiplying
  // by 1e6 introduces float noise (e.g. 0.5000000000000001), so round to 4
  // decimal places — the smallest meaningful unit per million tokens.
  return Math.round(n * 1_000_000 * 10_000) / 10_000;
}

function normalize(raw: OpenRouterApiModel): OpenRouterCatalogModel {
  return {
    id: raw.id,
    label: raw.name?.trim() || raw.id,
    description: raw.description?.trim() ?? "",
    inputCostPerMillionTokensUsd: parsePricePerToken(raw.pricing?.prompt),
    outputCostPerMillionTokensUsd: parsePricePerToken(raw.pricing?.completion),
    contextLength: raw.context_length ?? null,
    supportsTools: raw.supported_parameters?.includes("tools") ?? false,
  };
}

async function fetchCatalog(): Promise<OpenRouterCatalogModel[]> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.OPENROUTER_API_KEY) {
    headers.Authorization = `Bearer ${process.env.OPENROUTER_API_KEY}`;
  }
  const res = await fetch("https://openrouter.ai/api/v1/models", { headers });
  if (!res.ok) {
    throw new Error(`OpenRouter /models returned ${res.status}`);
  }
  const json = (await res.json()) as { data: OpenRouterApiModel[] };
  return json.data.map(normalize);
}

export async function listOpenRouterCatalog(opts?: { force?: boolean }): Promise<OpenRouterCatalogModel[]> {
  const now = Date.now();
  if (!opts?.force && cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.models;
  }
  if (inflight) return inflight;
  inflight = fetchCatalog()
    .then((models) => {
      cache = { fetchedAt: Date.now(), models };
      return models;
    })
    .catch((err) => {
      logger.warn({ err: err instanceof Error ? err.message : String(err) }, "openrouter catalog fetch failed");
      return cache?.models ?? [];
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function _resetOpenRouterCatalogCacheForTests() {
  cache = null;
  inflight = null;
}
