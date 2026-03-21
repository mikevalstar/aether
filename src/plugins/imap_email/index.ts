import type { AetherPlugin } from "../types";
import { imapClient } from "./client";
import { imapActivityTypes, imapMeta, imapOptionFields } from "./meta";

/** Client-safe plugin definition — no server imports */
export const imapPlugin: AetherPlugin = {
  meta: imapMeta,
  optionFields: imapOptionFields,
  activityTypes: imapActivityTypes,
  client: imapClient,
};
