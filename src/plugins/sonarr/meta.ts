import { Tv } from "lucide-react";
import type { PluginActivityType, PluginMeta, PluginOptionField } from "../types";

export const sonarrMeta: PluginMeta = {
  id: "sonarr",
  name: "Sonarr",
  description: "TV show download management via Sonarr — search, monitor, and manage your series library via AI.",
  icon: Tv,
  version: "0.1.0",
  hasHealthCheck: true,
};

export const sonarrOptionFields: PluginOptionField[] = [
  {
    key: "base_url",
    label: "Base URL",
    type: "text",
    description: "Sonarr instance URL (e.g., http://localhost:8989)",
    default: "http://localhost:8989",
    required: true,
  },
  {
    key: "api_key",
    label: "API Key",
    type: "password",
    description: "Sonarr API key (Settings → General in Sonarr UI)",
    required: true,
  },
];

export const sonarrActivityTypes: PluginActivityType[] = [
  { type: "sonarr_query", label: "Sonarr Query", icon: Tv },
  { type: "sonarr_action", label: "Sonarr Action", icon: Tv },
];
