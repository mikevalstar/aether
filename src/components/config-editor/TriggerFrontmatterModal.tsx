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

export type TriggerFrontmatterModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: ObsidianDocument;
  initialTab?: string;
  onSaved: () => void;
};

type FormState = {
  type: string;
  pattern: string;
  enabled: boolean;
  model: string;
  effort: string;
  maxTokens: string;
  notification: boolean;
  notificationLevel: string;
  notifyUsers: string[];
  pushMessage: boolean;
};

function extractFormState(fm: ObsidianDocument["frontmatter"]): FormState {
  return {
    type: typeof fm.type === "string" ? fm.type : "",
    pattern: typeof fm.pattern === "string" ? fm.pattern : "",
    enabled: fm.enabled !== false,
    model: typeof fm.model === "string" ? (resolveModelId(fm.model) ?? fm.model) : "claude-haiku-4-5",
    effort: typeof fm.effort === "string" ? fm.effort : "low",
    maxTokens: typeof fm.maxTokens === "number" ? String(fm.maxTokens) : "",
    notification: fm.notification !== false && fm.notification !== "silent",
    notificationLevel: typeof fm.notificationLevel === "string" ? fm.notificationLevel : "info",
    notifyUsers: Array.isArray(fm.notifyUsers) ? fm.notifyUsers : ["all"],
    pushMessage: fm.pushMessage === true,
  };
}

function formToFields(form: FormState): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    type: form.type,
    enabled: form.enabled,
    model: form.model,
    effort: form.effort,
    notification: form.notification ? "notify" : "silent",
    notificationLevel: form.notificationLevel,
    notifyUsers: form.notifyUsers,
    pushMessage: form.pushMessage,
  };

  fields.pattern = form.pattern || null;
  fields.maxTokens = form.maxTokens ? Number.parseInt(form.maxTokens, 10) : null;

  return fields;
}

function TabExplainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-md border border-[var(--line)] bg-[var(--teal-subtle)] px-3 py-2 text-xs text-[var(--ink-soft)]">
      {children}
    </div>
  );
}

export function TriggerFrontmatterModal({
  open,
  onOpenChange,
  document,
  initialTab,
  onSaved,
}: TriggerFrontmatterModalProps) {
  const [form, setForm] = useState<FormState>(() => extractFormState(document.frontmatter));
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(initialTab || "trigger");

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
      toast.success("Trigger configuration saved");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure Trigger</DialogTitle>
          <DialogDescription>{document.title}</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="trigger">Trigger</TabsTrigger>
            <TabsTrigger value="ai">AI Config</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="trigger" className="mt-4 min-h-[320px] space-y-4">
            <TabExplainer>
              Configure the event type this trigger responds to and an optional JMESPath pattern to filter events.
            </TabExplainer>

            <div className="space-y-1.5">
              <Label className="text-xs">Event Type</Label>
              <Input
                value={form.type}
                onChange={(e) => update("type", e.target.value)}
                placeholder="e.g. github, imap_email:new_email"
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-[var(--ink-soft)]">Matches the type string from webhooks or plugin events.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Pattern (optional)</Label>
              <Input
                value={form.pattern}
                onChange={(e) => update("pattern", e.target.value)}
                placeholder="JMESPath expression, e.g. action == 'opened'"
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-[var(--ink-soft)]">
                JMESPath expression evaluated against the JSON payload. Leave empty to match all events of this type.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Enabled</Label>
              <Switch checked={form.enabled} onCheckedChange={(v) => update("enabled", v)} />
            </div>
          </TabsContent>

          <TabsContent value="ai" className="mt-4 min-h-[320px] space-y-4">
            <TabExplainer>
              Choose the AI model and token budget for this trigger. Higher effort levels allow longer, more detailed
              responses.
            </TabExplainer>

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
                    htmlFor={`trigger-effort-${level}`}
                    className={cn(
                      "flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-md border p-3 transition-colors",
                      form.effort === level
                        ? "border-[var(--teal)] bg-[var(--teal)]/5"
                        : "border-[var(--line)] hover:border-[var(--ink-soft)]/30",
                    )}
                  >
                    <RadioGroupItem id={`trigger-effort-${level}`} value={level} className="sr-only" />
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
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-4 min-h-[320px] space-y-4">
            <TabExplainer>
              Control how you're notified when this trigger executes. Notifications appear in-app and optionally via push.
            </TabExplainer>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Send Notifications</Label>
                <p className="text-[11px] text-[var(--ink-soft)]">Notify on trigger execution</p>
              </div>
              <Switch checked={form.notification} onCheckedChange={(v) => update("notification", v)} />
            </div>

            {form.notification && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notification Level</Label>
                  <Select value={form.notificationLevel} onValueChange={(v) => update("notificationLevel", v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
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
