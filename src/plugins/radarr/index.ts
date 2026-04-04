import type { AetherPlugin } from "../types";
import { radarrClient } from "./client";
import { radarrActivityTypes, radarrMeta, radarrOptionFields } from "./meta";

/** Client-safe plugin definition — no server imports */
export const radarrPlugin: AetherPlugin = {
  meta: radarrMeta,
  optionFields: radarrOptionFields,
  activityTypes: radarrActivityTypes,
  client: radarrClient,
};
