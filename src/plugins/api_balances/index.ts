import type { AetherPlugin } from "../types";
import { apiBalancesClient } from "./client";
import { apiBalancesActivityTypes, apiBalancesMeta, apiBalancesOptionFields } from "./meta";

/** Client-safe plugin definition — no server imports */
export const apiBalancesPlugin: AetherPlugin = {
  meta: apiBalancesMeta,
  optionFields: apiBalancesOptionFields,
  activityTypes: apiBalancesActivityTypes,
  client: apiBalancesClient,
};
