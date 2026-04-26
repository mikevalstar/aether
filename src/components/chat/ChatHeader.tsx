import { ChevronDownIcon, FileDownIcon, MenuIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ModelEffortSelector } from "#/components/chat/ModelEffortSelector";
import { Button } from "#/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "#/components/ui/hover-card";
import type { ChatEffort, ChatModel } from "#/lib/chat/chat";
import { CHAT_MODELS } from "#/lib/chat/chat";
import type { CostBreakdown } from "#/lib/chat/chat-cost-aggregation";
import { getChatModelLabel } from "#/lib/chat/chat-usage";
import { Money } from "#/lib/format";

export interface ChatHeaderProps {
  title: string;
  model: ChatModel;
  effort: ChatEffort;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  /** When present, the stats row renders aggregate (parent + sub-agents) with a hover breakdown. */
  costBreakdown?: CostBreakdown;
  showStats?: boolean;
  disabled?: boolean;
  showMobileMenu?: boolean;
  editable?: boolean;
  onMobileMenuClick?: () => void;
  onModelChange?: (model: string) => void;
  onEffortChange?: (effort: string) => void;
  onTitleChange?: (title: string) => void;
  onDelete?: () => void;
  onExport?: () => void;
}

export function ChatHeader({
  title,
  model,
  effort,
  inputTokens = 0,
  outputTokens = 0,
  costUsd = 0,
  costBreakdown,
  showStats = false,
  disabled = false,
  showMobileMenu = false,
  editable = false,
  onMobileMenuClick,
  onModelChange,
  onEffortChange,
  onTitleChange,
  onDelete,
  onExport,
}: ChatHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(title);
  }, [title]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commitEdit = useCallback(() => {
    setIsEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== title) {
      onTitleChange?.(trimmed);
    } else {
      setEditValue(title);
    }
  }, [editValue, title, onTitleChange]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditValue(title);
  }, [title]);

  const currentModelLabel = CHAT_MODELS.find((m) => m.id === model)?.label ?? "Model";

  return (
    <div className="border-b-2 border-[var(--teal)] px-2 py-2 lg:px-4 lg:py-3">
      {/* Primary row: always visible */}
      <div className="flex items-center gap-2 lg:gap-3">
        {showMobileMenu && (
          <Button type="button" variant="ghost" size="icon-sm" onClick={onMobileMenuClick} aria-label="Open threads">
            <MenuIcon className="size-5" />
          </Button>
        )}

        <div className="group min-w-0 flex-1">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitEdit();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancelEdit();
                }
              }}
              className="w-full rounded border border-[var(--teal)]/40 bg-transparent px-1 py-0.5 text-base font-bold tracking-tight text-[var(--ink)] outline-none focus:border-[var(--teal)]"
            />
          ) : (
            <div className="flex items-center gap-1.5">
              <h1
                className={`truncate text-base font-bold tracking-tight text-[var(--ink)] ${editable ? "cursor-pointer hover:text-[var(--teal)]" : ""}`}
                onClick={editable ? () => setIsEditing(true) : undefined}
                onKeyDown={
                  editable
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setIsEditing(true);
                        }
                      }
                    : undefined
                }
                tabIndex={editable ? 0 : undefined}
                role={editable ? "button" : undefined}
              >
                {title}
              </h1>
              {editable && (
                <PencilIcon
                  className="size-3.5 shrink-0 text-[var(--ink-soft)] opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              )}
            </div>
          )}
        </div>

        {/* Mobile: compact summary + expand toggle */}
        <div className="flex items-center gap-1.5 lg:hidden">
          <span className="text-xs font-medium text-[var(--teal)]">{currentModelLabel}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileExpanded((v) => !v)}
            aria-label={mobileExpanded ? "Collapse controls" : "Expand controls"}
            className="text-[var(--ink-soft)]"
          >
            <ChevronDownIcon className={`size-4 transition-transform duration-150 ${mobileExpanded ? "rotate-180" : ""}`} />
          </Button>
        </div>

        {/* Desktop: inline controls (always visible) */}
        <div className="hidden items-center gap-2 lg:flex">
          <ModelEffortSelector
            model={model}
            effort={effort}
            disabled={disabled}
            modelClassName="lg:min-w-40"
            onModelChange={onModelChange}
            onEffortChange={onEffortChange}
          />

          {onExport && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              className="text-[var(--ink-soft)] hover:text-[var(--teal)]"
              onClick={onExport}
              title="Export to Obsidian"
            >
              <FileDownIcon className="size-4" />
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!onDelete || disabled}
            className="text-[var(--ink-soft)] hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2Icon className="size-4" />
          </Button>
        </div>
      </div>

      {/* Mobile: expandable controls panel */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-in-out lg:hidden ${mobileExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <ModelEffortSelector
              model={model}
              effort={effort}
              disabled={disabled}
              showModelBadges={false}
              modelClassName="flex-1"
              onModelChange={onModelChange}
              onEffortChange={onEffortChange}
            />

            <div className="ml-auto flex items-center gap-1">
              {onExport && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  className="text-[var(--ink-soft)] hover:text-[var(--teal)]"
                  onClick={onExport}
                  title="Export to Obsidian"
                >
                  <FileDownIcon className="size-4" />
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={!onDelete || disabled}
                className="text-[var(--ink-soft)] hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          </div>

          {showStats && (
            <StatsRow
              inputTokens={inputTokens}
              outputTokens={outputTokens}
              costUsd={costUsd}
              costBreakdown={costBreakdown}
              className="flex items-center gap-3 pt-2 text-xs text-[var(--ink-soft)]"
              inputSuffix="in"
              outputSuffix="out"
            />
          )}
        </div>
      </div>

      {/* Desktop: stats row */}
      {showStats && (
        <StatsRow
          inputTokens={inputTokens}
          outputTokens={outputTokens}
          costUsd={costUsd}
          costBreakdown={costBreakdown}
          className="mt-2 hidden items-center gap-3 text-xs text-[var(--ink-soft)] lg:flex"
          inputSuffix="input tokens"
          outputSuffix="output tokens"
        />
      )}
    </div>
  );
}

type StatsRowProps = {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  costBreakdown?: CostBreakdown;
  className: string;
  inputSuffix: string;
  outputSuffix: string;
};

function StatsRow({
  inputTokens,
  outputTokens,
  costUsd,
  costBreakdown,
  className,
  inputSuffix,
  outputSuffix,
}: StatsRowProps) {
  const row = (
    <div className={className}>
      <span>
        <span className="font-medium text-[var(--ink)]">{inputTokens.toLocaleString()}</span> {inputSuffix}
      </span>
      <span className="text-[var(--line)]">/</span>
      <span>
        <span className="font-medium text-[var(--ink)]">{outputTokens.toLocaleString()}</span> {outputSuffix}
      </span>
      <span className="text-[var(--line)]">/</span>
      <Money usd={costUsd} className="font-medium text-[var(--teal)]" />
    </div>
  );

  if (!costBreakdown || (costBreakdown.subAgents.count === 0 && costBreakdown.byModel.length <= 1)) {
    return row;
  }

  return (
    <HoverCard openDelay={150} closeDelay={80}>
      <HoverCardTrigger asChild>
        <div className="inline-block cursor-help">{row}</div>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto max-w-sm p-0" sideOffset={6} align="start">
        <CostBreakdownPanel breakdown={costBreakdown} />
      </HoverCardContent>
    </HoverCard>
  );
}

function CostBreakdownPanel({ breakdown }: { breakdown: CostBreakdown }) {
  const { parent, subAgents, byModel } = breakdown;
  const hasSubAgents = subAgents.count > 0;

  return (
    <div className="min-w-[240px] text-left text-xs">
      <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Cost breakdown
      </div>
      <div className="border-t border-border/60 px-3 py-2">
        <BreakdownRow
          label="Parent"
          inputTokens={parent.inputTokens}
          outputTokens={parent.outputTokens}
          cost={parent.estimatedCostUsd}
        />
        {hasSubAgents && (
          <BreakdownRow
            label={`Sub-agents (${subAgents.count})`}
            inputTokens={subAgents.inputTokens}
            outputTokens={subAgents.outputTokens}
            cost={subAgents.estimatedCostUsd}
          />
        )}
      </div>
      {byModel.length > 0 && (
        <div className="border-t border-border/60 px-3 py-2">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">By model</div>
          {byModel.map((m) => (
            <BreakdownRow
              key={m.model}
              label={getChatModelLabel(m.model)}
              inputTokens={m.inputTokens}
              outputTokens={m.outputTokens}
              cost={m.estimatedCostUsd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BreakdownRow({
  label,
  inputTokens,
  outputTokens,
  cost,
}: {
  label: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-0.5">
      <span className="truncate text-foreground">{label}</span>
      <span className="whitespace-nowrap tabular-nums text-muted-foreground">
        {inputTokens.toLocaleString()} / {outputTokens.toLocaleString()}{" "}
        <Money usd={cost} className="ml-1 font-medium text-[var(--teal)]" />
      </span>
    </div>
  );
}
