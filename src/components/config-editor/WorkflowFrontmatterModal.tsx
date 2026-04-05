import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { toast } from "#/components/ui/sonner";
import { Switch } from "#/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { UserPicker } from "#/components/ui/user-picker";
import { CHAT_MODELS, EFFORT_LABELS, resolveModelId } from "#/lib/chat/chat-models";
import { updateFrontmatterFields } from "#/lib/config-editor/config-editor.functions";
import type { ObsidianDocument } from "#/lib/obsidian/obsidian";
import { cn } from "#/lib/utils";
import { type FieldDefinition, FieldsArrayEditor } from "./FieldsArrayEditor";

export type WorkflowFrontmatterModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: ObsidianDocument;
  initialTab?: string;
  onSaved: () => void;
};

type FormState = {
  description: string;
  model: string;
  effort: string;
  maxTokens: string;
  notification: string;
  notificationLevel: string;
  notifyUsers: string[];
  pushMessage: boolean;
  fields: FieldDefinition[];
};

function extractFormState(fm: ObsidianDocument["frontmatter"]): FormState {
  const rawFields = Array.isArray(fm.fields) ? (fm.fields as unknown as Record<string, unknown>[]) : [];
  return {
    description: typeof fm.description === "string" ? fm.description : "",
    model: typeof fm.model === "string" ? (resolveModelId(fm.model) ?? fm.model) : "claude-haiku-4-5",
    effort: typeof fm.effort === "string" ? fm.effort : "low",
    maxTokens: typeof fm.maxTokens === "number" ? String(fm.maxTokens) : "",
    notification: typeof fm.notification === "string" ? fm.notification : "notify",
    notificationLevel: typeof fm.notificationLevel === "string" ? fm.notificationLevel : "info",
    notifyUsers: Array.isArray(fm.notifyUsers) ? fm.notifyUsers : ["all"],
    pushMessage: fm.pushMessage === true,
    fields: rawFields.map((f: Record<string, unknown>) => ({
      name: typeof f.name === "string" ? f.name : "",
      label: typeof f.label === "string" ? f.label : "",
      type: typeof f.type === "string" ? (f.type as FieldDefinition["type"]) : "text",
      required: f.required !== false,
      placeholder: typeof f.placeholder === "string" ? f.placeholder : "",
      options: Array.isArray(f.options) ? f.options : [],
      default: typeof f.default === "string" ? f.default : "",
    })),
  };
}

function formToFields(form: FormState): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    model: form.model,
    effort: form.effort,
    notification: form.notification,
    notificationLevel: form.notificationLevel,
    notifyUsers: form.notifyUsers,
    pushMessage: form.pushMessage,
    fields: form.fields.map((f) => {
      const entry: Record<string, unknown> = {
        name: f.name,
        label: f.label,
        type: f.type,
        required: f.required,
      };
      if (f.placeholder) entry.placeholder = f.placeholder;
      if (f.type === "select" && f.options.length > 0) entry.options = f.options;
      if (f.default) entry.default = f.default;
      return entry;
    }),
  };

  // Optional fields — set or remove
  fields.description = form.description || null;
  fields.maxTokens = form.maxTokens ? Number.parseInt(form.maxTokens, 10) : null;

  return fields;
}

// ─── Tab explainers ─────────────────────────────────────────────────────

function TabExplainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-md border border-[var(--line)] bg-[var(--teal-subtle)] px-3 py-2 text-xs text-[var(--ink-soft)]">
      {children}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

export function WorkflowFrontmatterModal({
  open,
  onOpenChange,
  document,
  initialTab,
  onSaved,
}: WorkflowFrontmatterModalProps) {
  const [form, setForm] = useState<FormState>(() => extractFormState(document.frontmatter));
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(initialTab || "ai");

  // Reset form when document changes or modal opens
  useEffect(() => {
    if (open) {
      setForm(extractFormState(document.frontmatter));
      if (initialTab) setTab(initialTab);
    }
  }, [open, document.frontmatter, initialTab]);

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await updateFrontmatterFields({
        data: {
          relativePath: document.relativePath,
          fields: formToFields(form),
        },
      });
      toast.success("Workflow configuration saved");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error("Failed to save", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  }

  // Extract placeholders from the document body for bidirectional validation
  const bodyPlaceholders = (document.body.match(/\{\{(\w+)\}\}/g) ?? []).map((m) => m.slice(2, -2));
  // Standard placeholders that don't need matching fields
  const standardPlaceholders = new Set(["date", "userName", "aiMemoryPath"]);
  const customPlaceholders = bodyPlaceholders.filter((p) => !standardPlaceholders.has(p));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure Workflow</DialogTitle>
          <DialogDescription>{document.title}</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="ai">AI Config</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="fields">Form Fields</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="mt-4 min-h-[420px] space-y-4">
            <TabExplainer>
              Choose the AI model and token budget for this workflow. Higher effort levels allow longer, more detailed
              responses.
            </TabExplainer>

            <div className="space-y-1.5">
              <Label className="text-xs">Description (optional)</Label>
              <Input
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Short description shown in the workflow list"
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Model</Label>
              <Select value={form.model} onValueChange={(v) => update("model", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHAT_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span>{m.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{m.description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Effort</Label>
              <RadioGroup value={form.effort} onValueChange={(v) => update("effort", v)} className="flex gap-3">
                {(["low", "medium", "high"] as const).map((level) => (
                  <Label
                    key={level}
                    htmlFor={`wf-effort-${level}`}
                    className={cn(
                      "flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-md border p-3 transition-colors",
                      form.effort === level
                        ? "border-[var(--teal)] bg-[var(--teal)]/5"
                        : "border-[var(--line)] hover:border-[var(--ink-soft)]/30",
                    )}
                  >
                    <RadioGroupItem id={`wf-effort-${level}`} value={level} className="sr-only" />
                    <span className="text-sm font-medium">{EFFORT_LABELS[level]}</span>
                    <span className="text-[10px] text-[var(--ink-soft)]">
                      {level === "low" ? "~1k tokens" : level === "medium" ? "~4k tokens" : "~16k tokens"}
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Max Tokens (optional override)</Label>
              <Input
                type="number"
                value={form.maxTokens}
                onChange={(e) => update("maxTokens", e.target.value)}
                placeholder="Use effort default"
                className="text-sm"
              />
              {form.maxTokens && (
                <p className="text-[11px] text-[var(--ink-soft)]">Overrides the effort level's default token budget.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-4 min-h-[420px] space-y-4">
            <TabExplainer>
              Control how you're notified when this workflow completes. Notifications appear in-app and optionally via push.
            </TabExplainer>

            <div className="space-y-1.5">
              <Label className="text-xs">Notification Mode</Label>
              <Select value={form.notification} onValueChange={(v) => update("notification", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="silent">Silent</SelectItem>
                  <SelectItem value="notify">Notify (in-app)</SelectItem>
                  <SelectItem value="push">Push (in-app + push)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.notification !== "silent" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notification Level</Label>
                  <Select value={form.notificationLevel} onValueChange={(v) => update("notificationLevel", v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Notify Users</Label>
                  <UserPicker value={form.notifyUsers} onChange={(v) => update("notifyUsers", v)} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Push Notification</Label>
                    <p className="text-[11px] text-[var(--ink-soft)]">Also send via Pushover</p>
                  </div>
                  <Switch checked={form.pushMessage} onCheckedChange={(v) => update("pushMessage", v)} />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="fields" className="mt-4 min-h-[420px] space-y-4">
            <TabExplainer>
              Define the form fields users fill out when running this workflow. Each field becomes a {"{{fieldName}}"}{" "}
              placeholder in the prompt template.
            </TabExplainer>

            <FieldsArrayEditor
              fields={form.fields}
              onChange={(fields) => update("fields", fields)}
              bodyPlaceholders={customPlaceholders}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
