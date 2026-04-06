import type { AetherPlugin } from "../types";
import { boardClient } from "./client";
import { boardMeta, boardOptionFields } from "./meta";
import { boardServer } from "./server";

/** Full plugin definition with server capabilities */
export const boardPluginFull: AetherPlugin = {
  meta: boardMeta,
  optionFields: boardOptionFields,
  server: boardServer,
  client: boardClient,
};
