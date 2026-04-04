import type { AetherPlugin } from "../types";
import { sonarrClient } from "./client";
import { sonarrActivityTypes, sonarrMeta, sonarrOptionFields } from "./meta";
import { sonarrServer } from "./server";

/** Full plugin definition with server capabilities */
export const sonarrPluginFull: AetherPlugin = {
  meta: sonarrMeta,
  optionFields: sonarrOptionFields,
  activityTypes: sonarrActivityTypes,
  server: sonarrServer,
  client: sonarrClient,
};
