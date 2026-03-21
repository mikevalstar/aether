import { fetchKiloBalance } from "./kilo";
import { fetchOpenAIBalance } from "./openai";
import { fetchOpenRouterBalance } from "./openrouter";

type ServiceTest = {
  name: string;
  enabled: boolean;
  apiKey: string | undefined;
  fetch: (key: string) => Promise<{ balance: number | null; error?: string }>;
};

type TestResult = { success: boolean; message: string };

// biome-ignore lint/suspicious/noExplicitAny: options come from serialization boundary
export async function testApiBalancesConnection(options: Record<string, any>): Promise<TestResult> {
  const tests: ServiceTest[] = [
    {
      name: "OpenRouter",
      enabled: !!options.openrouter_enabled,
      apiKey: options.openrouter_api_key,
      fetch: fetchOpenRouterBalance,
    },
    { name: "OpenAI", enabled: !!options.openai_enabled, apiKey: options.openai_api_key, fetch: fetchOpenAIBalance },
    { name: "Kilo Code", enabled: !!options.kilo_enabled, apiKey: options.kilo_api_key, fetch: fetchKiloBalance },
  ];

  const enabledTests = tests.filter((t): t is ServiceTest & { apiKey: string } => t.enabled && !!t.apiKey);
  if (enabledTests.length === 0) {
    return { success: false, message: "No services enabled with API keys configured" };
  }

  const results: string[] = [];
  let allOk = true;

  await Promise.all(
    enabledTests.map(async (t) => {
      try {
        const result = await t.fetch(t.apiKey);
        if (result.error) {
          allOk = false;
          results.push(`${t.name}: ${result.error}`);
        } else {
          results.push(`${t.name}: $${result.balance?.toFixed(2) ?? "?"}`);
        }
      } catch (err) {
        allOk = false;
        results.push(`${t.name}: ${err instanceof Error ? err.message : "Failed"}`);
      }
    }),
  );

  return {
    success: allOk,
    message: results.join(" | "),
  };
}
