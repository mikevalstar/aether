import type { BalanceResult } from "./types";

export async function fetchOpenRouterBalance(apiKey: string): Promise<BalanceResult> {
  const res = await fetch("https://openrouter.ai/api/v1/credits", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter API returned ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { data: { total_credits: number; total_usage: number } };
  const balance = data.data.total_credits - data.data.total_usage;

  return {
    service: "openrouter",
    serviceName: "OpenRouter",
    balance: Math.round(balance * 100) / 100,
    currency: "USD",
    lastChecked: new Date().toISOString(),
  };
}
