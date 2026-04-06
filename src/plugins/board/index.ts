import type { AetherPlugin } from "../types";
import { boardClient } from "./client";
import { boardMeta, boardOptionFields } from "./meta";

/** Client-safe plugin definition — no server imports */
export const boardPlugin: AetherPlugin = {
  meta: boardMeta,
  optionFields: boardOptionFields,
  client: boardClient,
};
