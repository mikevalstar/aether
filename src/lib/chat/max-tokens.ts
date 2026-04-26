import type { ChatEffort } from "#/lib/chat/chat-models";

const DEFAULTS: Record<ChatEffort, number> = {
  low: 40_000,
  medium: 50_000,
  high: 100_000,
};

const ENV_KEYS: Record<ChatEffort, string> = {
  low: "AETHER_MAX_TOKENS_LOW",
  medium: "AETHER_MAX_TOKENS_MEDIUM",
  high: "AETHER_MAX_TOKENS_HIGH",
};

function readEnvInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Default `max_tokens` for the given effort level. Overridable via
 * AETHER_MAX_TOKENS_LOW / _MEDIUM / _HIGH env vars.
 *
 * Why this matters: OpenRouter allocates ~20/50/80% of `max_tokens` to
 * reasoning at low/medium/high. Without an explicit cap, the provider's
 * default is sometimes small and the model can starve its final answer of
 * tokens after thinking. These defaults give reasoning enough headroom while
 * still capping runaway costs.
 */
export function getDefaultMaxTokensForEffort(effort: ChatEffort): number {
  return readEnvInt(ENV_KEYS[effort], DEFAULTS[effort]);
}
