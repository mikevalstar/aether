import { afterEach, describe, expect, it } from "vitest";
import { getDefaultMaxTokensForEffort } from "#/lib/chat/max-tokens";

const ENV_KEYS = ["AETHER_MAX_TOKENS_LOW", "AETHER_MAX_TOKENS_MEDIUM", "AETHER_MAX_TOKENS_HIGH"] as const;

afterEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
});

describe("getDefaultMaxTokensForEffort", () => {
  it("uses the built-in defaults when no env vars are set", () => {
    expect(getDefaultMaxTokensForEffort("low")).toBe(40_000);
    expect(getDefaultMaxTokensForEffort("medium")).toBe(50_000);
    expect(getDefaultMaxTokensForEffort("high")).toBe(100_000);
  });

  it("respects env overrides", () => {
    process.env.AETHER_MAX_TOKENS_LOW = "10000";
    process.env.AETHER_MAX_TOKENS_MEDIUM = "25000";
    process.env.AETHER_MAX_TOKENS_HIGH = "75000";
    expect(getDefaultMaxTokensForEffort("low")).toBe(10_000);
    expect(getDefaultMaxTokensForEffort("medium")).toBe(25_000);
    expect(getDefaultMaxTokensForEffort("high")).toBe(75_000);
  });

  it("falls back to the default for invalid env values", () => {
    process.env.AETHER_MAX_TOKENS_LOW = "not-a-number";
    process.env.AETHER_MAX_TOKENS_MEDIUM = "-5";
    process.env.AETHER_MAX_TOKENS_HIGH = "0";
    expect(getDefaultMaxTokensForEffort("low")).toBe(40_000);
    expect(getDefaultMaxTokensForEffort("medium")).toBe(50_000);
    expect(getDefaultMaxTokensForEffort("high")).toBe(100_000);
  });
});
