import cronstrue from "cronstrue";
import { BellIcon, BotIcon, CalendarClockIcon, HelpCircle, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { toast } from "#/components/ui/sonner";
import { Switch } from "#/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { CHAT_MODELS, type ChatEffort, EFFORT_LABELS } from "#/lib/chat/chat-models";
import { toggleFrontmatterField } from "#/lib/config-editor/config-editor.functions";
import type { ObsidianDocument } from "#/lib/obsidian/obsidian";
import { TaskFrontmatterModal } from "./TaskFrontmatterModal";

type TaskFrontmatterDisplayProps = {
  document: ObsidianDocument;
  onRefresh: () => void;
  userTimezone?: string;
  /** Auto-open the configure modal on mount (e.g. after creating a new task) */
  autoOpenModal?: boolean;
};

// ─── Helpers ────────────────────────────────────────────────────────────

function formatCron(cron: string): string {
  try {
    return cronstrue.toString(cron);
  } catch {
    return cron;
  }
}

function getModelLabel(modelId: string): string {
  const model = CHAT_MODELS.find((m) => m.id === modelId);
  return model?.label ?? modelId;
}

function getModelDescription(modelId: string): string {
  const model = CHAT_MODELS.find((m) => m.id === modelId);
  return model?.description ?? "";
}

function getEffortLabel(effort: string): string {
  return EFFORT_LABELS[effort as ChatEffort] ?? effort;
}

// ─── Field with tooltip ─────────────────────────────────────────────────

function Field({ label, tooltip, children }: { label: string; tooltip: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <div className="flex items-center gap-1">
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]/60">{label}</dt>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="size-3 text-[var(--ink-soft)]/40 cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>
            <p className="max-w-[200px] text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <dd className="text-sm text-[var(--ink)]">{children}</dd>
    </div>
  );
}

// ─── Section wrapper ────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  onConfigure,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  onConfigure: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="size-3.5 text-[var(--accent)]" />
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">{title}</h3>
        </div>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={onConfigure}>
          <Settings2 className="mr-1 size-3" />
          Configure
        </Button>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">{children}</div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

export function TaskFrontmatterDisplay({ document, onRefresh, userTimezone, autoOpenModal }: TaskFrontmatterDisplayProps) {
  const fm = document.frontmatter;
  const [toggling, setToggling] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<string>("schedule");

  // Auto-open modal on mount (e.g. after new task creation)
  useEffect(() => {
    if (autoOpenModal) {
      setModalTab("schedule");
      setModalOpen(true);
    }
  }, [autoOpenModal]);

  const enabled = fm.enabled !== false;
  const cron = typeof fm.cron === "string" ? fm.cron : "";
  const timezone = typeof fm.timezone === "string" ? fm.timezone : null;
  const endDate = typeof fm.endDate === "string" ? fm.endDate : null;
  const model = typeof fm.model === "string" ? fm.model : "claude-haiku-4-5";
  const effort = typeof fm.effort === "string" ? fm.effort : "low";
  const maxTokens = typeof fm.maxTokens === "number" ? fm.maxTokens : null;
  const notification = fm.notification !== false && fm.notification !== "silent";
  const notificationLevel = typeof fm.notificationLevel === "string" ? fm.notificationLevel : "info";
  const notifyUsers = Array.isArray(fm.notifyUsers) ? fm.notifyUsers : [];
  const pushMessage = fm.pushMessage === true;

  function openModal(tab: string) {
    setModalTab(tab);
    setModalOpen(true);
  }

  async function handleToggleEnabled(checked: boolean) {
    setToggling(true);
    try {
      await toggleFrontmatterField({
        data: {
          relativePath: document.relativePath,
          field: "enabled",
          value: checked,
        },
      });
      toast.success(checked ? "Task enabled" : "Task paused");
      onRefresh();
    } catch (err) {
      toast.error("Failed to toggle", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setToggling(false);
    }
  }

  return (
    <>
      <div className="border-b border-[var(--line)] bg-[var(--surface-alt)] px-6 py-4 sm:px-8">
        <div className="space-y-4">
          {/* ── Schedule ── */}
          <Section title="Schedule" icon={CalendarClockIcon} onConfigure={() => openModal("schedule")}>
            <Field label="Cron" tooltip="Cron expression defining when the task runs. Standard 5-field format.">
              <span>{formatCron(cron)}</span>
              <code className="ml-2 rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--ink-soft)]">
                {cron}
              </code>
            </Field>
            {timezone && (
              <Field label="Timezone" tooltip="IANA timezone for the cron schedule. Defaults to server timezone if unset.">
                {timezone}
              </Field>
            )}
            {endDate && (
              <Field label="End Date" tooltip="Task stops running after this date.">
                {endDate}
              </Field>
            )}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]/60">Enabled</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="size-3 text-[var(--ink-soft)]/40 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={6}>
                  <p className="max-w-[200px] text-xs">
                    Toggle to enable or pause this task. Paused tasks skip their scheduled runs.
                  </p>
                </TooltipContent>
              </Tooltip>
              <Switch checked={enabled} onCheckedChange={handleToggleEnabled} disabled={toggling} className="scale-75" />
              <Badge variant={enabled ? "default" : "secondary"} className="text-[10px]">
                {enabled ? "Active" : "Paused"}
              </Badge>
            </div>
          </Section>

          {/* ── AI Config ── */}
          <Section title="AI Config" icon={BotIcon} onConfigure={() => openModal("ai")}>
            <Field label="Model" tooltip="The AI model used to execute this task.">
              <span>{getModelLabel(model)}</span>
              {getModelDescription(model) && (
                <span className="ml-1.5 text-xs text-[var(--ink-soft)]">({getModelDescription(model)})</span>
              )}
            </Field>
            <Field label="Effort" tooltip="Controls the token budget: low (~1k), medium (~4k), high (~16k output tokens).">
              <Badge variant="outline" className="text-[10px]">
                {getEffortLabel(effort)}
              </Badge>
            </Field>
            {maxTokens !== null && (
              <Field label="Max Tokens" tooltip="Hard limit on output tokens, overriding the effort level's default.">
                {maxTokens.toLocaleString()}
              </Field>
            )}
          </Section>

          {/* ── Notifications ── */}
          <Section title="Notifications" icon={BellIcon} onConfigure={() => openModal("notifications")}>
            <Field
              label="Notify"
              tooltip='Whether to send notifications on task completion. "notify" sends, "silent" skips.'
            >
              <Badge variant={notification ? "default" : "secondary"} className="text-[10px]">
                {notification ? "On" : "Silent"}
              </Badge>
            </Field>
            <Field label="Level" tooltip="Notification severity: info, warning, or error.">
              <Badge variant="outline" className="text-[10px] capitalize">
                {notificationLevel}
              </Badge>
            </Field>
            {notifyUsers.length > 0 && (
              <Field label="Users" tooltip='Which users to notify. "all" notifies everyone.'>
                {notifyUsers.join(", ")}
              </Field>
            )}
            <Field label="Push" tooltip="Whether to also send a push notification via Pushover.">
              <Badge variant={pushMessage ? "default" : "secondary"} className="text-[10px]">
                {pushMessage ? "Yes" : "No"}
              </Badge>
            </Field>
          </Section>
        </div>
      </div>

      <TaskFrontmatterModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        document={document}
        initialTab={modalTab}
        onSaved={onRefresh}
        userTimezone={userTimezone}
      />
    </>
  );
}
