import type { AetherPlugin } from "../types";
import { sonarrClient } from "./client";
import { sonarrActivityTypes, sonarrMeta, sonarrOptionFields } from "./meta";

/** Client-safe plugin definition — no server imports */
export const sonarrPlugin: AetherPlugin = {
  meta: sonarrMeta,
  optionFields: sonarrOptionFields,
  activityTypes: sonarrActivityTypes,
  client: sonarrClient,
};
