import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Puzzle, XCircle } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertHeader } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { FieldRow } from "#/components/ui/field-row";
import { Input } from "#/components/ui/input";
import { SectionLabel } from "#/components/ui/section-label";
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
  // biome-ignore lint/suspicious/noExplicitAny: serialization boundary requires any
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
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1.5">
        <SectionLabel icon={Puzzle}>Plugin</SectionLabel>
        <h2 className="display-title text-2xl font-bold tracking-tight">{data.pluginName}</h2>
      </header>

      {!data.enabled && (
        <Alert variant="warning">
          <AlertHeader label="Plugin disabled" />
          <AlertDescription>
            This plugin is currently disabled. Enable it in the plugins list to use its features.
          </AlertDescription>
        </Alert>
      )}

      {data.optionFields.length > 0 && (
        <form onSubmit={(e) => void handleSave(e)} className="surface-card flex flex-col gap-5 p-6">
          <header className="flex flex-col gap-1.5">
            <SectionLabel>Configuration</SectionLabel>
            <p className="text-sm text-muted-foreground">Provide credentials and behavior options for this plugin.</p>
          </header>

          {data.optionFields.map((field) => (
            <OptionFieldInput
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={(v) => setValue(field.key, v)}
            />
          ))}

          <div className="mt-1 flex flex-wrap items-center gap-2">
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
              className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
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

          {data.options.lastTriggerCheckAt && (
            <div className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 font-mono text-[11px] tracking-wide text-[var(--ink-dim)]">
              <span className="font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">Last trigger check</span>
              <span className="mx-2 text-[var(--ink-faint)]">·</span>
              {new Date(data.options.lastTriggerCheckAt as string).toLocaleString()}
            </div>
          )}
        </form>
      )}

      {SettingsComponent && (
        <div className="surface-card p-6">
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
  const label = field.label.toUpperCase();
  const hint = field.required ? undefined : <span>optional</span>;

  if (field.type === "boolean") {
    return (
      <div className="flex items-start justify-between gap-4 border-b border-dashed border-[var(--line-strong)]/60 pb-3 last:border-b-0 last:pb-0">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--ink-soft)]">{label}</p>
          {field.description && <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>}
        </div>
        <Switch id={id} checked={(value as boolean) ?? (field.default as boolean) ?? false} onCheckedChange={onChange} />
      </div>
    );
  }

  if (field.type === "select" && field.options) {
    return (
      <FieldRow label={label} required={field.required} hint={hint} htmlFor={id}>
        <Select value={(value as string) ?? (field.default as string) ?? ""} onValueChange={onChange}>
          <SelectTrigger id={id} className="w-full font-mono text-[12.5px]">
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
      </FieldRow>
    );
  }

  return (
    <FieldRow label={label} required={field.required} hint={hint} htmlFor={id}>
      <Input
        id={id}
        type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
        className="font-mono text-[12.5px]"
        value={(value as string | number) ?? (field.default as string | number) ?? ""}
        onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
        required={field.required}
        placeholder={field.description}
      />
      {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
    </FieldRow>
  );
}
