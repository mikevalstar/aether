import type { AetherPlugin } from "../types";
import { imapClient } from "./client";
import { imapActivityTypes, imapMeta, imapOptionFields } from "./meta";
import { imapServer } from "./server";

/** Full plugin definition with server capabilities */
export const imapPluginFull: AetherPlugin = {
  meta: imapMeta,
  optionFields: imapOptionFields,
  activityTypes: imapActivityTypes,
  server: imapServer,
  client: imapClient,
};
