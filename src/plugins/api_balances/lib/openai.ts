import type { BalanceResult } from "./types";

type CreditGrantsResponse = {
  object: string;
  total_granted: number;
  total_used: number;
  total_available: number;
  grants?: { data: Array<{ id: string; grant_amount: number; used_amount: number; expires_at: number }> };
};

export async function fetchOpenAIBalance(apiKey: string): Promise<BalanceResult> {
  const res = await fetch("https://api.openai.com/v1/dashboard/billing/credit_grants", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI API returned ${res.status}: ${text}`);
  }

  const data = (await res.json()) as CreditGrantsResponse;

  return {
    service: "openai",
    serviceName: "OpenAI",
    balance: Math.round(data.total_available * 100) / 100,
    currency: "USD",
    lastChecked: new Date().toISOString(),
  };
}
