import { Wallet } from "lucide-react";
import type { PluginActivityType, PluginMeta, PluginOptionField } from "../types";

export const apiBalancesMeta: PluginMeta = {
  id: "api_balances",
  name: "API Balances",
  description: "Check credit balances across AI service providers (OpenRouter, OpenAI, Kilo Code).",
  icon: Wallet,
  version: "0.1.0",
  hasHealthCheck: true,
};

export const apiBalancesOptionFields: PluginOptionField[] = [
  // ── OpenRouter ──
  {
    key: "openrouter_enabled",
    label: "Enable OpenRouter",
    type: "boolean",
    description: "Show OpenRouter balance",
    default: false,
  },
  {
    key: "openrouter_api_key",
    label: "OpenRouter API Key",
    type: "password",
    description: "Management API key (not a provisioned key)",
  },

  // ── OpenAI ──
  {
    key: "openai_enabled",
    label: "Enable OpenAI",
    type: "boolean",
    description: "Show OpenAI credit balance",
    default: false,
  },
  {
    key: "openai_api_key",
    label: "OpenAI API Key",
    type: "password",
    description: "Standard API key — uses legacy billing endpoint",
  },

  // ── Kilo Code ──
  {
    key: "kilo_enabled",
    label: "Enable Kilo Code",
    type: "boolean",
    description: "Show Kilo Code balance (experimental — undocumented API)",
    default: false,
  },
  {
    key: "kilo_api_key",
    label: "Kilo Code API Key",
    type: "password",
    description: "API key for Kilo Code",
  },
];

export const apiBalancesActivityTypes: PluginActivityType[] = [
  { type: "balance_check", label: "Balance Check", icon: Wallet },
];
