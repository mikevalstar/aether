import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetOpenRouterCatalogCacheForTests, listOpenRouterCatalog } from "#/lib/chat/openrouter-catalog";

const sampleResponse = {
  data: [
    {
      id: "meta-llama/llama-4",
      name: "Llama 4 70B",
      description: "Big llama",
      context_length: 128000,
      pricing: { prompt: "0.0000005", completion: "0.000002" },
      supported_parameters: ["tools", "temperature"],
    },
    {
      id: "openai/gpt-test",
      name: "GPT Test",
      description: "",
      context_length: 8000,
      pricing: { prompt: "0.000001", completion: "0.000003" },
    },
  ],
};

const originalFetch = globalThis.fetch;

beforeEach(() => {
  _resetOpenRouterCatalogCacheForTests();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("listOpenRouterCatalog", () => {
  it("normalizes the catalog (label, description, $/M pricing, supportsTools)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sampleResponse,
    }) as unknown as typeof fetch;

    const list = await listOpenRouterCatalog();

    expect(list).toHaveLength(2);
    expect(list[0]).toEqual({
      id: "meta-llama/llama-4",
      label: "Llama 4 70B",
      description: "Big llama",
      contextLength: 128000,
      inputCostPerMillionTokensUsd: 0.5,
      outputCostPerMillionTokensUsd: 2,
      supportsTools: true,
    });
    expect(list[1].supportsTools).toBe(false);
  });

  it("returns the cache on subsequent calls within TTL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => sampleResponse });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await listOpenRouterCatalog();
    await listOpenRouterCatalog();
    await listOpenRouterCatalog();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns an empty list (does not throw) when the API is unreachable", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) as unknown as typeof fetch;
    const list = await listOpenRouterCatalog();
    expect(list).toEqual([]);
  });

  it("returns an empty list when the response is non-2xx", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch;
    const list = await listOpenRouterCatalog();
    expect(list).toEqual([]);
  });
});
