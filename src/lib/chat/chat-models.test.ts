import { describe, expect, it } from "vitest";
import {
  BUILTIN_CHAT_MODELS,
  findModelDef,
  getModelProvider,
  getProviderModelId,
  getWebToolVersion,
  resolveModelId,
  supportsCodeExecution,
} from "#/lib/chat/chat-models";
import { getChatModelLabel } from "#/lib/chat/chat-usage";

describe("resolveModelId", () => {
  it("returns the canonical id for a built-in", () => {
    expect(resolveModelId("claude-haiku-4-5")).toBe("claude-haiku-4-5");
  });

  it("resolves an alias to the canonical id", () => {
    // MiniMax-M2.7 has the openrouter alias 'minimax/minimax-m2.7'
    expect(resolveModelId("minimax/minimax-m2.7")).toBe("MiniMax-M2.7");
  });

  it("passes through a well-formed provider/model id (user-selected OpenRouter)", () => {
    expect(resolveModelId("meta-llama/llama-4-70b-instruct")).toBe("meta-llama/llama-4-70b-instruct");
  });

  it("rejects garbage", () => {
    expect(resolveModelId("not a model")).toBeUndefined();
  });
});

describe("provider helpers", () => {
  it("returns the built-in provider when known", () => {
    expect(getModelProvider("claude-sonnet-4-6")).toBe("anthropic");
  });

  it("falls back to openrouter for unknown provider/model ids", () => {
    expect(getModelProvider("anthropic-clone/some-model")).toBe("openrouter");
  });

  it("uses the providerIds map when present", () => {
    expect(getProviderModelId("MiniMax-M2.7", "openrouter")).toBe("minimax/minimax-m2.7");
    expect(getProviderModelId("MiniMax-M2.7", "minimax")).toBe("MiniMax-M2.7");
  });

  it("returns the bare id when no providerIds entry exists", () => {
    expect(getProviderModelId("z-ai/glm-5", "openrouter")).toBe("z-ai/glm-5");
  });

  it("defaults webToolVersion to 'none' for unknown ids", () => {
    expect(getWebToolVersion("foo/bar")).toBe("none");
    expect(getWebToolVersion("claude-haiku-4-5")).toBe("legacy");
  });

  it("supportsCodeExecution is false for unknown ids", () => {
    expect(supportsCodeExecution("foo/bar")).toBe(false);
    expect(supportsCodeExecution("claude-sonnet-4-6")).toBe(true);
  });
});

describe("findModelDef", () => {
  it("finds a built-in", () => {
    expect(findModelDef("claude-haiku-4-5")?.label).toBe("Claude Haiku 4.5");
  });

  it("finds via the extras list when not built-in", () => {
    const extras = [
      {
        ...BUILTIN_CHAT_MODELS[0],
        id: "meta-llama/llama-4",
        label: "Llama 4",
        provider: "openrouter" as const,
      },
    ];
    expect(findModelDef("meta-llama/llama-4", extras)?.label).toBe("Llama 4");
  });
});

describe("getChatModelLabel", () => {
  it("renders the snapshotted label even when the model is no longer in the catalog", () => {
    expect(getChatModelLabel("retired/x-1", "Retired Model X1")).toBe("Retired Model X1");
  });

  it("falls back to the catalog when no snapshot is provided", () => {
    expect(getChatModelLabel("claude-haiku-4-5")).toBe("Claude Haiku 4.5");
  });

  it("falls back to the bare id when neither snapshot nor catalog match", () => {
    expect(getChatModelLabel("foo/bar")).toBe("foo/bar");
  });

  it("ignores blank snapshots", () => {
    expect(getChatModelLabel("claude-haiku-4-5", "  ")).toBe("Claude Haiku 4.5");
  });
});
