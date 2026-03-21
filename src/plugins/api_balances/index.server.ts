import type { AetherPlugin } from "../types";
import { apiBalancesClient } from "./client";
import { apiBalancesActivityTypes, apiBalancesMeta, apiBalancesOptionFields } from "./meta";
import { apiBalancesServer } from "./server";

/** Full plugin definition with server capabilities */
export const apiBalancesPluginFull: AetherPlugin = {
  meta: apiBalancesMeta,
  optionFields: apiBalancesOptionFields,
  activityTypes: apiBalancesActivityTypes,
  server: apiBalancesServer,
  client: apiBalancesClient,
};
