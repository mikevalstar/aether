import { BellIcon, BotIcon, FormInput, HelpCircle, ListChecks, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { CHAT_MODELS, type ChatEffort, EFFORT_LABELS } from "#/lib/chat/chat-models";
import type { ObsidianDocument } from "#/lib/obsidian/obsidian";
import { WorkflowFrontmatterModal } from "./WorkflowFrontmatterModal";

type WorkflowFrontmatterDisplayProps = {
  document: ObsidianDocument;
  onRefresh: () => void;
  /** Auto-open the configure modal on mount (e.g. after creating a new workflow) */
  autoOpenModal?: boolean;
};

// ─── Helpers ────────────────────────────────────────────────────────────

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

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  textarea: "Textarea",
  url: "URL",
  select: "Select",
};

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

export function WorkflowFrontmatterDisplay({ document, onRefresh, autoOpenModal }: WorkflowFrontmatterDisplayProps) {
  const fm = document.frontmatter;
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<string>("ai");

  // Auto-open modal on mount (e.g. after new workflow creation)
  useEffect(() => {
    if (autoOpenModal) {
      setModalTab("fields");
      setModalOpen(true);
    }
  }, [autoOpenModal]);

  const description = typeof fm.description === "string" ? fm.description : null;
  const model = typeof fm.model === "string" ? fm.model : "claude-haiku-4-5";
  const effort = typeof fm.effort === "string" ? fm.effort : "low";
  const maxTokens = typeof fm.maxTokens === "number" ? fm.maxTokens : null;
  const notification = typeof fm.notification === "string" ? fm.notification : "notify";
  const notificationLevel = typeof fm.notificationLevel === "string" ? fm.notificationLevel : "info";
  const notifyUsers = Array.isArray(fm.notifyUsers) ? fm.notifyUsers : [];
  const pushMessage = fm.pushMessage === true;
  const fields = Array.isArray(fm.fields) ? (fm.fields as unknown as Record<string, unknown>[]) : [];

  function openModal(tab: string) {
    setModalTab(tab);
    setModalOpen(true);
  }

  return (
    <>
      <div className="border-b border-[var(--line)] bg-[var(--surface-alt)]/60 px-6 py-4 sm:px-8">
        <div className="space-y-4">
          {/* Description */}
          {description && <p className="text-sm text-[var(--ink-soft)] italic">{description}</p>}

          {/* ── AI Config ── */}
          <Section title="AI Config" icon={BotIcon} onConfigure={() => openModal("ai")}>
            <Field label="Model" tooltip="The AI model used to execute this workflow.">
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
              label="Mode"
              tooltip='Notification mode on completion: "silent" skips, "notify" shows in-app, "push" also sends push notification.'
            >
              <Badge variant={notification === "silent" ? "secondary" : "default"} className="text-[10px] capitalize">
                {notification}
              </Badge>
            </Field>
            <Field label="Level" tooltip="Notification severity: info, low, medium, high, or critical.">
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

          {/* ── Form Fields ── */}
          <Section title="Form Fields" icon={ListChecks} onConfigure={() => openModal("fields")}>
            <div className="w-full">
              {fields.length === 0 ? (
                <p className="text-xs text-[var(--ink-soft)]">No fields defined yet. Click Configure to add form fields.</p>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-xs text-[var(--ink-soft)]">
                    {fields.length} field{fields.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {fields.map((field, i) => {
                      const name = typeof field.name === "string" ? field.name : `field-${i}`;
                      const label = typeof field.label === "string" ? field.label : name;
                      const type = typeof field.type === "string" ? field.type : "text";
                      const required = field.required !== false;
                      return (
                        <div
                          key={name}
                          className="flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1"
                        >
                          <FormInput className="size-3 text-[var(--ink-soft)]/60" />
                          <span className="text-xs font-medium text-[var(--ink)]">{label}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0">
                            {FIELD_TYPE_LABELS[type] ?? type}
                          </Badge>
                          {required && <span className="text-[9px] font-medium text-[var(--coral)]">*</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>

      <WorkflowFrontmatterModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        document={document}
        initialTab={modalTab}
        onSaved={onRefresh}
      />
    </>
  );
}
