import type { AetherPlugin } from "../types";
import { radarrClient } from "./client";
import { radarrActivityTypes, radarrMeta, radarrOptionFields } from "./meta";
import { radarrServer } from "./server";

/** Full plugin definition with server capabilities */
export const radarrPluginFull: AetherPlugin = {
  meta: radarrMeta,
  optionFields: radarrOptionFields,
  activityTypes: radarrActivityTypes,
  server: radarrServer,
  client: radarrClient,
};
