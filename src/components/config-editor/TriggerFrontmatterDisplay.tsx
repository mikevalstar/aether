import { BellIcon, BotIcon, HelpCircle, Settings2, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { toast } from "#/components/ui/sonner";
import { Switch } from "#/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { CHAT_MODELS, type ChatEffort, EFFORT_LABELS } from "#/lib/chat/chat-models";
import { toggleFrontmatterField } from "#/lib/config-editor/config-editor.functions";
import type { ObsidianDocument } from "#/lib/obsidian/obsidian";
import { TriggerFrontmatterModal } from "./TriggerFrontmatterModal";

type TriggerFrontmatterDisplayProps = {
  document: ObsidianDocument;
  onRefresh: () => void;
  autoOpenModal?: boolean;
};

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
          <Icon className="size-3.5 text-[var(--teal)]" />
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--teal)]">{title}</h3>
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

export function TriggerFrontmatterDisplay({ document, onRefresh, autoOpenModal }: TriggerFrontmatterDisplayProps) {
  const fm = document.frontmatter;
  const [toggling, setToggling] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<string>("trigger");

  useEffect(() => {
    if (autoOpenModal) {
      setModalTab("trigger");
      setModalOpen(true);
    }
  }, [autoOpenModal]);

  const enabled = fm.enabled !== false;
  const type = typeof fm.type === "string" ? fm.type : "";
  const pattern = typeof fm.pattern === "string" ? fm.pattern : null;
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
      toast.success(checked ? "Trigger enabled" : "Trigger paused");
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
          {/* ── Trigger Config ── */}
          <Section title="Trigger" icon={Zap} onConfigure={() => openModal("trigger")}>
            <Field label="Type" tooltip="Event type this trigger responds to — matches webhook type or plugin event.">
              <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[11px]">{type || "—"}</code>
            </Field>
            {pattern && (
              <Field label="Pattern" tooltip="JMESPath expression evaluated against the JSON payload to filter events.">
                <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[11px] max-w-[300px] truncate inline-block">
                  {pattern}
                </code>
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
                    Toggle to enable or pause this trigger. Paused triggers won't fire on events.
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
            <Field label="Model" tooltip="The AI model used to execute this trigger.">
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
              tooltip='Whether to send notifications on trigger execution. "notify" sends, "silent" skips.'
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

      <TriggerFrontmatterModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        document={document}
        initialTab={modalTab}
        onSaved={onRefresh}
      />
    </>
  );
}
