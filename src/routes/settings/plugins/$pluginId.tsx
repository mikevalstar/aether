import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { toast } from "#/components/ui/sonner";
import { Switch } from "#/components/ui/switch";
import { getPlugin } from "#/plugins";
import { getPluginOptions, savePluginOptions, testPluginConnection } from "#/plugins/plugins.functions";
import type { PluginClientContext, PluginOptionField } from "#/plugins/types";

export const Route = createFileRoute("/settings/plugins/$pluginId")({
  loader: async ({ params }) => await getPluginOptions({ data: { pluginId: params.pluginId } }),
  component: PluginSettingsPage,
});

type PluginSettingsData = {
  options: Record<string, any>;
  optionFields: import("#/plugins/types").PluginOptionField[];
  pluginName: string;
  enabled: boolean;
};

function PluginSettingsPage() {
  const { pluginId } = Route.useParams();
  const data = Route.useLoaderData() as PluginSettingsData;
  const plugin = getPlugin(pluginId);
  const [values, setValues] = useState<Record<string, unknown>>(data.options);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const hasTestableConfig = plugin?.meta.hasHealthCheck ?? false;

  function setValue(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await savePluginOptions({ data: { pluginId, options: values } });
      toast.success("Plugin settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  }

  const SettingsComponent = plugin?.client?.SettingsComponent;

  // Build a minimal client context for the custom settings component
  const clientCtx: PluginClientContext = {
    pluginId,
    options: values,
    obsidian: {
      read: async () => null,
      write: async () => {},
      list: async () => [],
      search: async () => [],
    },
    logActivity: async () => {},
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          to="/settings/plugins"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Back to Plugins
        </Link>
      </div>

      <h2 className="text-lg font-semibold">{data.pluginName}</h2>

      {!data.enabled && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          This plugin is currently disabled. Enable it in the plugins list to use its features.
        </p>
      )}

      {data.optionFields.length > 0 && (
        <form onSubmit={(e) => void handleSave(e)} className="surface-card space-y-4 rounded-lg p-6">
          <h3 className="text-sm font-semibold">Configuration</h3>

          {data.optionFields.map((field) => (
            <OptionFieldInput
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={(v) => setValue(field.key, v)}
            />
          ))}

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save settings"}
            </Button>

            {hasTestableConfig && (
              <Button
                type="button"
                variant="outline"
                disabled={isTesting}
                onClick={async () => {
                  setIsTesting(true);
                  setTestResult(null);
                  try {
                    const result = await testPluginConnection({ data: { pluginId, options: values } });
                    setTestResult(result);
                    if (result.success) {
                      toast.success(result.message);
                    } else {
                      toast.error("Connection failed", { description: result.message });
                    }
                  } catch {
                    setTestResult({ success: false, message: "Test request failed" });
                    toast.error("Test request failed");
                  } finally {
                    setIsTesting(false);
                  }
                }}
              >
                {isTesting ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
                Test Connection
              </Button>
            )}
          </div>

          {testResult && (
            <div
              className={`mt-2 flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
                testResult.success
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
              ) : (
                <XCircle className="mt-0.5 size-3.5 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </form>
      )}

      {SettingsComponent && (
        <div className="surface-card rounded-lg p-6">
          <SettingsComponent
            ctx={clientCtx}
            onSave={async (opts) => {
              setValues(opts);
              await savePluginOptions({ data: { pluginId, options: opts } });
              toast.success("Plugin settings saved");
            }}
          />
        </div>
      )}
    </div>
  );
}

function OptionFieldInput({
  field,
  value,
  onChange,
}: {
  field: PluginOptionField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const id = `plugin-opt-${field.key}`;

  if (field.type === "boolean") {
    return (
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor={id}>{field.label}</Label>
          {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
        </div>
        <Switch id={id} checked={(value as boolean) ?? (field.default as boolean) ?? false} onCheckedChange={onChange} />
      </div>
    );
  }

  if (field.type === "select" && field.options) {
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={id}>{field.label}</Label>
        <Select value={(value as string) ?? (field.default as string) ?? ""} onValueChange={onChange}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
      </div>
    );
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{field.label}</Label>
      <Input
        id={id}
        type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
        value={(value as string | number) ?? (field.default as string | number) ?? ""}
        onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
        required={field.required}
        placeholder={field.description}
      />
      {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
    </div>
  );
}
