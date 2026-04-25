import { useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowUpRight, Loader2, Play } from "lucide-react";
import { useState } from "react";
import { MentionTextarea } from "#/components/mentions/MentionTextarea";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { toast } from "#/components/ui/sonner";
import { runWorkflow } from "#/lib/workflows/workflow.functions";
import type { WorkflowField } from "#/lib/workflows/workflow-executor";

function FieldLabel({
  htmlFor,
  label,
  required,
  hint,
}: {
  htmlFor: string;
  label: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-1.5 flex items-baseline gap-2">
      <label htmlFor={htmlFor} className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
        {label}
        {required && <span className="ml-1 text-[var(--accent)]">*</span>}
      </label>
      <div className="flex-1 border-b border-dashed border-[var(--line-strong)] dark:border-white/15" />
      {hint && <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">{hint}</span>}
    </div>
  );
}

function isFullWidth(field: WorkflowField): boolean {
  return field.type === "textarea";
}

export function WorkflowForm({
  filename,
  title,
  description,
  model,
  fields,
  fileExists,
  workflowId,
}: {
  filename: string;
  title: string;
  description: string | null;
  model: string;
  fields: WorkflowField[];
  fileExists: boolean;
  /** Optional display id for the eyebrow ("WF_01"). */
  workflowId?: string;
}) {
  const router = useRouter();
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    for (const field of fields) {
      if (field.default) defaults[field.name] = field.default;
    }
    return defaults;
  });
  const [submitting, setSubmitting] = useState(false);

  function setValue(name: string, value: string) {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      await runWorkflow({ data: { filename, formValues } });
      toast.success("Workflow started", {
        description: `${title} is running in the background.`,
      });
      const defaults: Record<string, string> = {};
      for (const field of fields) {
        if (field.default) defaults[field.name] = field.default;
      }
      setFormValues(defaults);
      router.invalidate();
    } catch (err) {
      toast.error("Failed to start workflow", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!fileExists) {
    return (
      <div className="rounded-lg border border-[var(--table-border)] bg-[var(--table-surface)] p-6 text-center text-sm text-[var(--ink-soft)]">
        Workflow file has been removed. Past runs are still available below.
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          void handleSubmit(e);
        }
      }}
      className="flex flex-col gap-5 rounded-lg border border-[var(--table-border)] bg-[var(--table-surface)] p-5"
    >
      {/* Header band */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              Run Workflow
            </span>
            <span className="text-[var(--ink-faint)]">·</span>
            <h2 className="text-base font-semibold text-[var(--ink)]">{title}</h2>
            <Badge variant="model-name">{model}</Badge>
          </div>
          {description && <p className="text-xs leading-relaxed text-[var(--ink-soft)]">{description}</p>}
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
          {workflowId && <span className="font-mono font-semibold">{workflowId}</span>}
          {workflowId && <span className="mx-1.5 text-[var(--ink-faint)]">·</span>}
          {fields.length} field{fields.length !== 1 ? "s" : ""}
        </span>
      </header>

      {/* Fields — 2-col grid; textareas span full row. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          const id = `field-${field.name}`;
          const fullWidth = isFullWidth(field);
          const hint = field.required ? undefined : field.type === "textarea" ? "markdown ok" : "optional";
          const isUrl = field.type === "url";
          return (
            <div key={field.name} className={fullWidth ? "sm:col-span-2" : undefined}>
              <FieldLabel htmlFor={id} label={field.label} required={field.required} hint={hint} />
              {field.type === "textarea" ? (
                <MentionTextarea
                  id={id}
                  value={formValues[field.name] ?? ""}
                  onValueChange={(v) => setValue(field.name, v)}
                  placeholder={field.placeholder}
                  required={field.required}
                  rows={4}
                  className="bg-[var(--bg)] dark:bg-[var(--bg)]"
                />
              ) : field.type === "select" && field.options ? (
                <Select
                  value={formValues[field.name] ?? ""}
                  onValueChange={(v) => setValue(field.name, v)}
                  required={field.required}
                >
                  <SelectTrigger id={id} className="w-full bg-[var(--bg)] dark:bg-[var(--bg)] dark:hover:bg-[var(--surface)]">
                    <SelectValue placeholder={field.placeholder ?? "Select..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : isUrl ? (
                <div className="flex items-stretch gap-1.5">
                  <span className="flex aspect-square h-9 shrink-0 items-center justify-center rounded-md border border-[var(--input)] bg-[var(--surface)] text-[var(--ink-soft)]">
                    <ArrowUpRight className="size-4" />
                  </span>
                  <Input
                    id={id}
                    type="url"
                    value={formValues[field.name] ?? ""}
                    onChange={(e) => setValue(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="bg-[var(--bg)] dark:bg-[var(--bg)]"
                  />
                </div>
              ) : (
                <Input
                  id={id}
                  type="text"
                  value={formValues[field.name] ?? ""}
                  onChange={(e) => setValue(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  className="bg-[var(--bg)] dark:bg-[var(--bg)]"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line-strong)] pt-4 dark:border-white/15">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
          <kbd className="font-mono">⌘ ↵</kbd> to run
        </span>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void navigate({ to: "/workflows" })}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? <Loader2 className="animate-spin" /> : <Play />}
            Run Workflow
          </Button>
        </div>
      </footer>
    </form>
  );
}
