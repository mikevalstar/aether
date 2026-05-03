import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon, FileDownIcon, MenuIcon, PencilIcon, SquarePenIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ModelSelector } from "#/components/chat/ModelSelector";
import { Button } from "#/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "#/components/ui/hover-card";
import type { ChatEffort, ChatModel } from "#/lib/chat/chat";
import { CHAT_MODELS } from "#/lib/chat/chat";
import type { CostBreakdown } from "#/lib/chat/chat-cost-aggregation";
import { type ChatRunStatus, formatRunClock, formatRunCost, formatRunDuration, formatTokens } from "#/lib/chat/chat-run";
import { getChatModelLabel } from "#/lib/chat/chat-usage";

export interface ChatRunHeaderProps {
  threadId: string;
  title: string;
  model: ChatModel;
  effort: ChatEffort;
  startedAt: Date | string;
  endedAt: Date | string;
  status: ChatRunStatus;
  inputTokens: number;
  outputTokens: number;
  toolCalls: number;
  writes: number;
  costUsd: number;
  costBreakdown?: CostBreakdown;
  busy?: boolean;
  editable?: boolean;
  parentLink?: { href: string; title?: string; subAgentFile?: string };
  onTitleChange?: (title: string) => void;
  onModelChange?: (model: string) => void;
  onEffortChange?: (effort: string) => void;
  onDelete?: () => void;
  onExport?: () => void;
  onMenuOpen?: () => void;
}

const STATUS_LABEL: Record<ChatRunStatus, string> = {
  streaming: "STREAMING",
  settled: "SETTLED",
  error: "ERROR",
};

export function ChatRunHeader(props: ChatRunHeaderProps) {
  const {
    threadId,
    title,
    model,
    effort,
    startedAt,
    endedAt,
    status,
    inputTokens,
    outputTokens,
    toolCalls,
    writes,
    costUsd,
    costBreakdown,
    busy,
    editable,
    parentLink,
    onTitleChange,
    onModelChange,
    onEffortChange,
    onDelete,
    onExport,
    onMenuOpen,
  } = props;

  const modelDef = CHAT_MODELS.find((m) => m.id === model);
  const modelLabel = modelDef?.label ?? "Model";
  const modelKind = modelDef?.description ?? "";

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setEditValue(title), [title]);
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commitEdit = useCallback(() => {
    setIsEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== title) onTitleChange?.(trimmed);
    else setEditValue(title);
  }, [editValue, title, onTitleChange]);

  const statusColor =
    status === "streaming" ? "var(--accent)" : status === "error" ? "var(--destructive)" : "var(--success, var(--accent))";

  return (
    <header className="relative border-b border-[var(--line)] bg-[var(--surface)]">
      {parentLink && (
        <div className="flex items-center gap-3 border-b border-[var(--line)] bg-[var(--accent-subtle)] px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--accent)]">
          <span>SUB-AGENT THREAD</span>
          {parentLink.subAgentFile && (
            <code className="rounded border border-[var(--accent)]/30 bg-[var(--bg)]/60 px-1.5 py-0.5 text-[10px] text-[var(--ink-soft)] normal-case tracking-normal">
              {parentLink.subAgentFile}
            </code>
          )}
          <a
            href={parentLink.href}
            className="ml-auto inline-flex items-center gap-1 rounded border border-[var(--line)] bg-[var(--bg)] px-2 py-0.5 normal-case tracking-normal text-[var(--ink-soft)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
          >
            <ArrowLeftIcon className="size-3" />
            Parent thread
            {parentLink.title && (
              <span className="ml-1 max-w-[24ch] truncate text-[var(--ink-faint)]">{parentLink.title}</span>
            )}
          </a>
        </div>
      )}

      <div className="px-4 py-2.5 lg:px-6 lg:py-3">
        {/* Mobile-only model + compact stats line */}
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)] lg:hidden">
          <span className="truncate">{modelLabel}</span>
          <span className="ml-auto flex shrink-0 items-center gap-2 tabular-nums">
            <span className="text-[var(--ink-soft)]">{formatTokens(inputTokens + outputTokens)}</span>
            <span className="text-[var(--line-strong)]">·</span>
            <span className="text-[var(--accent)]">{formatRunCost(costUsd)}</span>
          </span>
        </div>

        {/* Kicker row — desktop only */}
        <div className="hidden flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)] lg:flex">
          <span className="text-[var(--ink-soft)]" title={threadId}>
            RUN_{threadId.startsWith("thread_") ? threadId.slice(7) : threadId}
          </span>
          <span className="h-3 w-px bg-[var(--line)]" />
          <span
            className="inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5"
            style={{
              color: statusColor,
              borderColor: `color-mix(in oklab, ${statusColor} 40%, transparent)`,
              background: `color-mix(in oklab, ${statusColor} 10%, transparent)`,
            }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{
                background: statusColor,
                boxShadow: status === "streaming" ? `0 0 8px ${statusColor}` : "none",
              }}
            />
            {STATUS_LABEL[status]}
          </span>
          <span className="text-[var(--ink-soft)]">
            {modelLabel}
            {modelKind && <span className="ml-1 text-[var(--ink-faint)]">· {modelKind.toUpperCase()}</span>}
          </span>
          <span className="ml-auto flex items-center gap-3 text-[var(--ink-faint)] normal-case">
            <span className="font-mono uppercase tracking-[0.14em]">
              {formatRunClock(startedAt)} <span className="text-[var(--line-strong)]">→</span> {formatRunClock(endedAt)}
              <span className="ml-1 text-[var(--ink-soft)]">· {formatRunDuration(startedAt, endedAt)}</span>
            </span>
          </span>
        </div>

        {/* Title row */}
        <div className="mt-2 flex items-center gap-3">
          <div className="group min-w-0 flex-1">
            {isEditing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitEdit();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setIsEditing(false);
                    setEditValue(title);
                  }
                }}
                className="w-full bg-transparent text-lg font-semibold tracking-tight text-[var(--ink)] outline-none lg:text-xl"
              />
            ) : (
              <div className="flex items-baseline gap-2">
                <h1
                  className={`min-w-0 truncate text-lg font-semibold tracking-tight text-[var(--ink)] lg:text-xl ${
                    editable ? "cursor-pointer hover:text-[var(--accent)]" : ""
                  }`}
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
                    className="size-3.5 shrink-0 text-[var(--ink-faint)] opacity-0 transition group-hover:opacity-100"
                    aria-hidden
                  />
                )}
              </div>
            )}
          </div>

          <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
            <ModelSelector
              model={model}
              effort={effort}
              modelLabel={modelDef?.label}
              modelDescription={modelDef?.description}
              disabled={busy}
              onModelChange={onModelChange}
              onEffortChange={onEffortChange}
            />
            {onExport && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={busy}
                className="text-[var(--ink-soft)] hover:text-[var(--accent)]"
                onClick={onExport}
                title="Export to Obsidian"
              >
                <FileDownIcon className="size-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={busy}
                className="text-[var(--ink-soft)] hover:text-destructive"
                onClick={onDelete}
                title="Delete thread"
              >
                <Trash2Icon className="size-4" />
              </Button>
            )}
          </div>

          {/* Mobile menu buttons — stay inline since action buttons are hidden on mobile */}
          <Link
            to="/chat"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--bg)] text-[var(--ink-soft)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] lg:hidden"
            title="New chat"
            aria-label="New chat"
          >
            <SquarePenIcon className="size-4" />
          </Link>
          {onMenuOpen && (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="shrink-0 border-[var(--line)] bg-[var(--bg)] text-[var(--ink-soft)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] lg:hidden"
              onClick={onMenuOpen}
              title="Open menu (⌘J)"
              aria-label="Open chat menu"
            >
              <MenuIcon className="size-4" />
            </Button>
          )}
        </div>

        {/* Stats row — desktop only */}
        <div className="hidden items-end justify-between gap-3 lg:flex">
          <StatsRow
            inputTokens={inputTokens}
            outputTokens={outputTokens}
            toolCalls={toolCalls}
            writes={writes}
            costUsd={costUsd}
            costBreakdown={costBreakdown}
          />
          <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
            <Link
              to="/chat"
              className="inline-flex h-7 items-center gap-2 rounded-md border border-[var(--line-strong)] bg-[var(--bg)] px-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)] hover:border-[var(--accent)]/50 hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)]"
              title="New chat"
              aria-label="New chat"
            >
              <SquarePenIcon className="size-3.5" />
              <span>New</span>
            </Link>
            {onMenuOpen && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 items-center gap-2 border-[var(--line-strong)] bg-[var(--bg)] px-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)] hover:border-[var(--accent)]/50 hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)]"
                onClick={onMenuOpen}
                title="Open chat menu"
                aria-label="Open chat menu"
              >
                <MenuIcon className="size-3.5" />
                <span>Threads</span>
                <span className="rounded border border-[var(--line)] bg-[var(--surface)] px-1 py-px text-[9px] tracking-[0.1em] text-[var(--ink-faint)]">
                  ⌘J
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function StatsRow({
  inputTokens,
  outputTokens,
  toolCalls,
  writes,
  costUsd,
  costBreakdown,
}: {
  inputTokens: number;
  outputTokens: number;
  toolCalls: number;
  writes: number;
  costUsd: number;
  costBreakdown?: CostBreakdown;
}) {
  const tiles: Array<{ value: string; label: string; mono?: boolean; cost?: boolean }> = [
    { value: formatTokens(inputTokens), label: "IN" },
    { value: formatTokens(outputTokens), label: "OUT" },
    { value: toolCalls.toString(), label: "CALLS" },
    { value: writes.toString(), label: "WRITES" },
    { value: formatRunCost(costUsd), label: "COST", cost: true },
  ];
  const showBreakdown = !!costBreakdown && (costBreakdown.subAgents.count > 0 || costBreakdown.byModel.length > 1);

  const grid = (
    <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
      {tiles.map((tile) => (
        <div key={tile.label}>
          <div
            className={`text-[15px] leading-none tracking-tight tabular-nums ${
              tile.cost ? "font-semibold text-[var(--accent)]" : "font-medium text-[var(--ink)]"
            }`}
          >
            {tile.value}
          </div>
          <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">{tile.label}</div>
        </div>
      ))}
    </div>
  );

  if (!showBreakdown || !costBreakdown) return grid;

  return (
    <HoverCard openDelay={150} closeDelay={80}>
      <HoverCardTrigger asChild>
        <div className="cursor-help">{grid}</div>
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
      <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
        Cost breakdown
      </div>
      <div className="border-t border-[var(--line)] px-3 py-2">
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
        <div className="border-t border-[var(--line)] px-3 py-2">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">By model</div>
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
      <span className="whitespace-nowrap tabular-nums text-[var(--ink-soft)]">
        {inputTokens.toLocaleString()} / {outputTokens.toLocaleString()}{" "}
        <span className="ml-1 font-medium text-[var(--accent)]">{formatRunCost(cost)}</span>
      </span>
    </div>
  );
}
