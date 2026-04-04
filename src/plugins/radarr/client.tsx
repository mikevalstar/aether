import { Film } from "lucide-react";
import type { AetherPluginClient } from "../types";

export const radarrClient: AetherPluginClient = {
  commands: [
    {
      label: "Radarr Settings",
      icon: Film,
      route: "/settings/plugins/radarr",
    },
  ],
};
