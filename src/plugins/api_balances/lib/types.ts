export type ServiceId = "openrouter" | "openai" | "kilo";

export type BalanceResult = {
  service: ServiceId;
  serviceName: string;
  balance: number | null;
  currency: string;
  lastChecked: string;
  error?: string;
};

export type CacheEntry = {
  result: BalanceResult;
  fetchedAt: number;
};

export type ApiBalancesOptions = {
  openrouter_enabled?: boolean;
  openrouter_api_key?: string;
  openai_enabled?: boolean;
  openai_api_key?: string;
  kilo_enabled?: boolean;
  kilo_api_key?: string;
};

export const SERVICE_CONFIG: Record<ServiceId, { name: string }> = {
  openrouter: { name: "OpenRouter" },
  openai: { name: "OpenAI" },
  kilo: { name: "Kilo Code" },
};
