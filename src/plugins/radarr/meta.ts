import { Film } from "lucide-react";
import type { PluginActivityType, PluginMeta, PluginOptionField } from "../types";

export const radarrMeta: PluginMeta = {
  id: "radarr",
  name: "Radarr",
  description: "Movie download management via Radarr — search, monitor, and manage your movie library via AI.",
  icon: Film,
  version: "0.1.0",
  hasHealthCheck: true,
};

export const radarrOptionFields: PluginOptionField[] = [
  {
    key: "base_url",
    label: "Base URL",
    type: "text",
    description: "Radarr instance URL (e.g., http://localhost:7878)",
    default: "http://localhost:7878",
    required: true,
  },
  {
    key: "api_key",
    label: "API Key",
    type: "password",
    description: "Radarr API key (Settings → General in Radarr UI)",
    required: true,
  },
];

export const radarrActivityTypes: PluginActivityType[] = [
  { type: "radarr_query", label: "Radarr Query", icon: Film },
  { type: "radarr_action", label: "Radarr Action", icon: Film },
];
