import { tool } from "ai";
import { z } from "zod";
import { logger } from "#/lib/logger";
import type { AetherPluginServer } from "../types";
import { clearCache, getCached, setCache } from "./lib/balance-cache";
import { fetchKiloBalance } from "./lib/kilo";
import { fetchOpenAIBalance } from "./lib/openai";
import { fetchOpenRouterBalance } from "./lib/openrouter";
import { type ApiBalancesOptions, type BalanceResult, SERVICE_CONFIG, type ServiceId } from "./lib/types";

type ServiceFetcher = {
  id: ServiceId;
  enabledKey: keyof ApiBalancesOptions;
  apiKeyKey: keyof ApiBalancesOptions;
  fetch: (apiKey: string) => Promise<BalanceResult>;
};

const SERVICE_FETCHERS: ServiceFetcher[] = [
  { id: "openrouter", enabledKey: "openrouter_enabled", apiKeyKey: "openrouter_api_key", fetch: fetchOpenRouterBalance },
  { id: "openai", enabledKey: "openai_enabled", apiKeyKey: "openai_api_key", fetch: fetchOpenAIBalance },
  { id: "kilo", enabledKey: "kilo_enabled", apiKeyKey: "kilo_api_key", fetch: fetchKiloBalance },
];

async function fetchAllBalances(opts: ApiBalancesOptions, userId: string): Promise<BalanceResult[]> {
  const results: BalanceResult[] = [];

  await Promise.all(
    SERVICE_FETCHERS.map(async (svc) => {
      if (!opts[svc.enabledKey]) return;
      const apiKey = opts[svc.apiKeyKey] as string | undefined;
      if (!apiKey) {
        results.push({
          service: svc.id,
          serviceName: SERVICE_CONFIG[svc.id].name,
          balance: null,
          currency: "USD",
          lastChecked: new Date().toISOString(),
          error: "API key not configured",
        });
        return;
      }

      // Check cache first
      const cached = getCached(userId, svc.id);
      if (cached) {
        results.push(cached);
        return;
      }

      try {
        const result = await svc.fetch(apiKey);
        setCache(userId, svc.id, result);
        results.push(result);
      } catch (err) {
        const errorResult: BalanceResult = {
          service: svc.id,
          serviceName: SERVICE_CONFIG[svc.id].name,
          balance: null,
          currency: "USD",
          lastChecked: new Date().toISOString(),
          error: err instanceof Error ? err.message : "Failed to fetch balance",
        };
        setCache(userId, svc.id, errorResult);
        results.push(errorResult);
      }
    }),
  );

  return results;
}

function hasAnyServiceEnabled(opts: ApiBalancesOptions): boolean {
  return SERVICE_FETCHERS.some((svc) => opts[svc.enabledKey]);
}

export const apiBalancesServer: AetherPluginServer = {
  systemPrompt: `You have access to the api_balances_get_balances tool. Use it when the user asks about their API credits, balance, or remaining funds on AI platforms like OpenRouter, OpenAI, or Kilo Code.`,

  createTools(ctx) {
    return {
      get_balances: tool({
        description:
          "Get current credit balances for configured AI services. Returns balance amounts, currency, and last-checked timestamps.",
        inputSchema: z.object({}),
        execute: async () => {
          logger.info({ userId: ctx.userId }, "api_balances tool: get_balances invoked");
          try {
            const opts = await ctx.getOptions<ApiBalancesOptions>();
            if (!hasAnyServiceEnabled(opts)) {
              return { error: "No services enabled. Configure services in Settings > Plugins > API Balances." };
            }
            const balances = await fetchAllBalances(opts, ctx.userId);
            await ctx.logActivity({
              type: "balance_check",
              summary: `Checked balances for ${balances.length} service(s)`,
              metadata: { services: balances.map((b) => b.service) },
            });
            logger.info({ count: balances.length, userId: ctx.userId }, "api_balances tool: get_balances complete");
            return { balances };
          } catch (err) {
            logger.error({ err, userId: ctx.userId }, "api_balances tool: get_balances failed");
            return { error: err instanceof Error ? err.message : "Failed to fetch balances" };
          }
        },
      }),
    };
  },

  async loadWidgetData(ctx) {
    logger.debug({ userId: ctx.userId }, "api_balances: loading widget data");
    try {
      const opts = await ctx.getOptions<ApiBalancesOptions>();
      if (!hasAnyServiceEnabled(opts)) {
        return { configured: false, balances: [] };
      }
      const balances = await fetchAllBalances(opts, ctx.userId);
      logger.info({ count: balances.length }, "api_balances: widget data loaded");
      return { configured: true, balances };
    } catch (err) {
      logger.error({ err, userId: ctx.userId }, "api_balances: widget data load failed");
      return {
        configured: true,
        error: err instanceof Error ? err.message : "Failed to load balances",
        balances: [],
      };
    }
  },

  async checkHealth(ctx) {
    logger.debug({ userId: ctx.userId }, "api_balances: health check");
    const opts = await ctx.getOptions<ApiBalancesOptions>();
    if (!hasAnyServiceEnabled(opts)) {
      return { status: "warning", message: "No services enabled" };
    }

    // Clear cache so health check fetches fresh data
    clearCache(ctx.userId);
    const balances = await fetchAllBalances(opts, ctx.userId);

    const ok = balances.filter((b) => !b.error);
    const failed = balances.filter((b) => b.error);

    if (ok.length === 0) {
      return { status: "error", message: failed.map((b) => `${b.serviceName}: ${b.error}`).join(" | ") };
    }

    const summary = ok.map((b) => `${b.serviceName}: $${b.balance?.toFixed(2) ?? "?"}`).join(" | ");
    if (failed.length > 0) {
      const failSummary = failed.map((b) => `${b.serviceName}: error`).join(", ");
      return { status: "warning", message: `${summary} | ${failSummary}` };
    }

    return { status: "ok", message: summary };
  },
};
