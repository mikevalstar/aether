import type { BalanceResult } from "./types";

type KiloBalanceResponse = {
  balance: number;
  isDepleted: boolean;
};

export async function fetchKiloBalance(apiKey: string): Promise<BalanceResult> {
  const res = await fetch("https://app.kilo.ai/api/profile/balance", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Kilo API returned ${res.status}: ${text}`);
  }

  const data = (await res.json()) as KiloBalanceResponse;

  return {
    service: "kilo",
    serviceName: "Kilo Code",
    balance: Math.round(data.balance * 100) / 100,
    currency: "USD",
    lastChecked: new Date().toISOString(),
  };
}
