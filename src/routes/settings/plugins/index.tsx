import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Settings } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { toast } from "#/components/ui/sonner";
import { Switch } from "#/components/ui/switch";
import { plugins } from "#/plugins";
import { checkPluginHealthFn, getPluginsPageData, togglePlugin } from "#/plugins/plugins.functions";
import type { PluginHealthStatus } from "#/plugins/types";

export const Route = createFileRoute("/settings/plugins/")({
  loader: async () => await getPluginsPageData(),
  component: PluginsPage,
});

function PluginsPage() {
  const data = Route.useLoaderData();
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(data.plugins.map((p) => [p.id, p.enabled])),
  );
  const [toggling, setToggling] = useState<string | null>(null);
  const [healthMap, setHealthMap] = useState<Record<string, PluginHealthStatus>>({});
  const [healthLoading, setHealthLoading] = useState<Record<string, boolean>>({});

  async function handleToggle(pluginId: string, enabled: boolean) {
    setToggling(pluginId);
    try {
      await togglePlugin({ data: { pluginId, enabled } });
      setEnabledMap((prev) => ({ ...prev, [pluginId]: enabled }));
      toast.success(`Plugin ${enabled ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to update plugin");
    } finally {
      setToggling(null);
    }
  }

  async function handleCheckHealth(pluginId: string) {
    setHealthLoading((prev) => ({ ...prev, [pluginId]: true }));
    try {
      const result = await checkPluginHealthFn({ data: { pluginId } });
      setHealthMap((prev) => ({ ...prev, [pluginId]: result }));
    } catch {
      setHealthMap((prev) => ({ ...prev, [pluginId]: { status: "error", message: "Check failed" } }));
    } finally {
      setHealthLoading((prev) => ({ ...prev, [pluginId]: false }));
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Plugins</h2>
      <p className="text-sm text-muted-foreground">Enable or disable plugins and configure their settings.</p>

      <div className="space-y-3">
        {plugins.map((plugin) => {
          const pluginData = data.plugins.find((p) => p.id === plugin.meta.id);
          const isEnabled = enabledMap[plugin.meta.id] ?? false;
          const isToggling = toggling === plugin.meta.id;
          const health = healthMap[plugin.meta.id];
          const isCheckingHealth = healthLoading[plugin.meta.id];
          const hasHealthCheck = pluginData?.hasHealthCheck ?? false;
          const Icon = plugin.meta.icon;

          return (
            <div key={plugin.meta.id} className="surface-card flex items-start gap-4 rounded-lg p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-teal-subtle">
                <Icon className="size-5 text-[var(--teal)]" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{plugin.meta.name}</h3>
                  <span className="text-[10px] text-muted-foreground/60">v{plugin.meta.version}</span>
                  {health && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        health.status === "ok"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : health.status === "warning"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          health.status === "ok"
                            ? "bg-emerald-500"
                            : health.status === "warning"
                              ? "bg-amber-500"
                              : "bg-red-500"
                        }`}
                      />
                      {health.message}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{plugin.meta.description}</p>

                {isEnabled && (
                  <div className="mt-2 flex items-center gap-2">
                    <Link
                      to="/settings/plugins/$pluginId"
                      params={{ pluginId: plugin.meta.id }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--teal)] hover:underline"
                    >
                      <Settings className="size-3" />
                      Settings
                    </Link>
                    {hasHealthCheck && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 py-0.5 text-xs"
                        onClick={() => void handleCheckHealth(plugin.meta.id)}
                        disabled={isCheckingHealth}
                      >
                        {isCheckingHealth ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}
                        Check Health
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <Switch
                checked={isEnabled}
                onCheckedChange={(checked) => void handleToggle(plugin.meta.id, checked)}
                disabled={isToggling}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
