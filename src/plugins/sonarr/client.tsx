import { Tv } from "lucide-react";
import type { AetherPluginClient } from "../types";

export const sonarrClient: AetherPluginClient = {
  commands: [
    {
      label: "Sonarr Settings",
      icon: Tv,
      route: "/settings/plugins/sonarr",
    },
  ],
};
