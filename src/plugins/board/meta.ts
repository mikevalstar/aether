import { Columns3 } from "lucide-react";
import type { PluginMeta, PluginOptionField } from "../types";

export const boardMeta: PluginMeta = {
  id: "board",
  name: "Kanban Board",
  description: "Drag-and-drop kanban board powered by Obsidian Kanban files.",
  icon: Columns3,
  version: "0.1.0",
};

export const boardOptionFields: PluginOptionField[] = [];
