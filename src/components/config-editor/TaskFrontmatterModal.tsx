import { CalendarIcon, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { toast } from "#/components/ui/sonner";
import { Switch } from "#/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { UserPicker } from "#/components/ui/user-picker";
import { CHAT_MODELS, EFFORT_LABELS, resolveModelId } from "#/lib/chat/chat-models";
import { updateFrontmatterFields } from "#/lib/config-editor/config-editor.functions";
import { TIMEZONE_GROUPS } from "#/lib/config-editor/timezones";
import type { ObsidianDocument } from "#/lib/obsidian/obsidian";
import { cn } from "#/lib/utils";
import { CronBuilder } from "./CronBuilder";

export type TaskFrontmatterModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: ObsidianDocument;
  initialTab?: string;
  onSaved: () => void;
  userTimezone?: string;
};

type FormState = {
  cron: string;
  timezone: string;
  endDate: string;
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
    cron: typeof fm.cron === "string" ? fm.cron : "0 9 * * *",
    timezone: typeof fm.timezone === "string" ? fm.timezone : "",
    endDate: typeof fm.endDate === "string" ? fm.endDate : "",
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
    cron: form.cron,
    enabled: form.enabled,
    model: form.model,
    effort: form.effort,
    notification: form.notification ? "notify" : "silent",
    notificationLevel: form.notificationLevel,
    notifyUsers: form.notifyUsers,
    pushMessage: form.pushMessage,
  };

  // Optional fields — set or remove
  fields.timezone = form.timezone || null;
  fields.endDate = form.endDate || null;
  fields.maxTokens = form.maxTokens ? Number.parseInt(form.maxTokens, 10) : null;

  return fields;
}

// ─── Tab explainers ─────────────────────────────────────────────────────

function TabExplainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-md border border-[var(--line)] bg-[var(--accent-subtle)] px-3 py-2 text-xs text-[var(--ink-soft)]">
      {children}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

export function TaskFrontmatterModal({
  open,
  onOpenChange,
  document,
  initialTab,
  onSaved,
  userTimezone,
}: TaskFrontmatterModalProps) {
  const [form, setForm] = useState<FormState>(() => extractFormState(document.frontmatter));
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(initialTab || "schedule");

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
      toast.success("Task configuration saved");
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
          <DialogTitle>Configure Task</DialogTitle>
          <DialogDescription>{document.title}</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="ai">AI Config</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="mt-4 min-h-[420px] space-y-4">
            <TabExplainer>
              Configure when and how often this task runs. The cron schedule determines the execution timing.
            </TabExplainer>

            <CronBuilder value={form.cron} onChange={(v) => update("cron", v)} timezone={form.timezone || undefined} />

            <div className="space-y-1.5">
              <Label className="text-xs">Timezone</Label>
              <Select
                value={form.timezone || "__none__"}
                onValueChange={(v) => update("timezone", v === "__none__" ? "" : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Server default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Server default</SelectItem>
                  {userTimezone && (
                    <SelectGroup>
                      <SelectLabel>Your timezone</SelectLabel>
                      <SelectItem value={userTimezone}>{userTimezone.replace(/_/g, " ")}</SelectItem>
                    </SelectGroup>
                  )}
                  {TIMEZONE_GROUPS.map((group) => (
                    <SelectGroup key={group.label}>
                      <SelectLabel>{group.label}</SelectLabel>
                      {group.timezones.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">End Date (optional)</Label>
              <EndDatePicker value={form.endDate} onChange={(v) => update("endDate", v)} />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Enabled</Label>
              <Switch checked={form.enabled} onCheckedChange={(v) => update("enabled", v)} />
            </div>
          </TabsContent>

          <TabsContent value="ai" className="mt-4 min-h-[420px] space-y-4">
            <TabExplainer>
              Choose the AI model and token budget for this task. Higher effort levels allow longer, more detailed responses.
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
                    htmlFor={`effort-${level}`}
                    className={cn(
                      "flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-md border p-3 transition-colors",
                      form.effort === level
                        ? "border-[var(--accent)] bg-[var(--accent)]/5"
                        : "border-[var(--line)] hover:border-[var(--ink-soft)]/30",
                    )}
                  >
                    <RadioGroupItem id={`effort-${level}`} value={level} className="sr-only" />
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
              Control how you're notified when this task completes. Notifications appear in-app and optionally via push.
            </TabExplainer>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Send Notifications</Label>
                <p className="text-[11px] text-[var(--ink-soft)]">Notify on task completion</p>
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

// ─── End Date Picker ────────────────────────────────────────────────────

function EndDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(`${value}T00:00:00`) : undefined;

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-9 w-full justify-start border-input bg-background px-3 text-left text-sm font-normal hover:bg-background dark:bg-background dark:hover:bg-background",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 size-4" />
            {value || "No end date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              onChange(d ? d.toISOString().slice(0, 10) : "");
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {value && (
        <Button variant="ghost" size="sm" onClick={() => onChange("")} className="shrink-0 text-xs">
          Clear
        </Button>
      )}
    </div>
  );
}
