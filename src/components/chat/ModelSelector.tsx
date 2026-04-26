import { CheckIcon, ChevronDownIcon, StarIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { CHAT_EFFORT_LEVELS, type ChatEffort, EFFORT_LABELS } from "#/lib/chat/chat-models";
import { type ChatModelOption, listChatModels } from "#/lib/chat/chat-models.functions";
import { useStarredModels } from "#/lib/chat/model-stars";

const PROVIDER_LABEL: Record<string, string> = {
  anthropic: "Anthropic",
  openrouter: "OpenRouter",
  minimax: "MiniMax",
};

function formatPricing(opt: ChatModelOption): string | null {
  if (opt.inputCostPerMillionTokensUsd == null || opt.outputCostPerMillionTokensUsd == null) return null;
  return `$${opt.inputCostPerMillionTokensUsd}/${opt.outputCostPerMillionTokensUsd}`;
}

export interface ModelSelectorProps {
  /** Currently selected model id. May or may not exist in the loaded list. */
  model: string;
  /** Currently selected effort. Only rendered when the resolved model supports effort. */
  effort: ChatEffort;
  /** Fallback label shown while the list loads or if `model` is no longer in the list. */
  modelLabel?: string;
  /** Fallback description for the same case. */
  modelDescription?: string;
  disabled?: boolean;
  /** Skip the network fetch and use this list directly (for stories, tests, or callers that already have it). */
  models?: ChatModelOption[];
  onModelChange?: (model: string) => void;
  onEffortChange?: (effort: string) => void;
}

function seedOption(model: string, label?: string, description?: string): ChatModelOption {
  return {
    id: model,
    label: label || model,
    description: description || "",
    supportsEffort: false,
    provider: "unknown",
  };
}

export function ModelSelector({
  model,
  effort,
  modelLabel,
  modelDescription,
  disabled = false,
  models: modelsOverride,
  onModelChange,
  onEffortChange,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [fetched, setFetched] = useState<ChatModelOption[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isStarred, toggle } = useStarredModels();

  // Fetch the live model list unless an override was provided.
  useEffect(() => {
    if (modelsOverride) return;
    let cancelled = false;
    listChatModels()
      .then((list) => {
        if (!cancelled) setFetched(list);
      })
      .catch(() => {
        // Swallow — the seeded option below keeps the trigger usable.
      });
    return () => {
      cancelled = true;
    };
  }, [modelsOverride]);

  const models = modelsOverride ?? fetched ?? [];
  const current = models.find((m) => m.id === model);
  const triggerLabel = current?.label ?? modelLabel ?? model;
  const supportsEffort = current?.supportsEffort ?? false;
  const isUnavailable = !current && (!!modelLabel || models.length > 0);

  const { starredList, restList } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? models.filter(
          (m) =>
            m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.description.toLowerCase().includes(q),
        )
      : models;
    const starred: ChatModelOption[] = [];
    const rest: ChatModelOption[] = [];
    for (const m of matched) (isStarred(m.id) ? starred : rest).push(m);
    const byLabel = (a: ChatModelOption, b: ChatModelOption) => a.label.localeCompare(b.label);
    starred.sort(byLabel);
    rest.sort(byLabel);
    return { starredList: starred, restList: rest };
  }, [models, query, isStarred]);

  const totalCount = starredList.length + restList.length;

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
    else setQuery("");
  }, [open]);

  const seededTriggerLabel = current
    ? current.label
    : models.length === 0 && (modelLabel || model)
      ? (modelLabel ?? model)
      : triggerLabel;

  return (
    <div className="inline-flex items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="inline-flex h-9 min-w-56 items-center gap-2 rounded-md border border-[var(--accent)]/30 bg-[var(--accent-subtle)] px-3 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent-subtle)]/80 disabled:opacity-50"
          >
            <span className="truncate">{seededTriggerLabel}</span>
            <ChevronDownIcon className="ml-auto size-3.5 shrink-0 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[440px] overflow-hidden p-0" align="start">
          <div className="border-b border-[var(--line)] px-3 py-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search models…"
              className="w-full bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
            />
          </div>
          <div className="max-h-72 overflow-y-auto py-1 pr-3" style={{ scrollbarGutter: "stable" }}>
            {totalCount === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-[var(--ink-faint)]">
                {models.length === 0 ? "Loading models…" : "No models found."}
              </div>
            ) : (
              <>
                {!current && modelLabel && (
                  <Row
                    option={seedOption(model, modelLabel, modelDescription)}
                    starred={false}
                    selected
                    unavailable
                    onSelect={() => setOpen(false)}
                    onToggleStar={() => {}}
                  />
                )}
                {starredList.map((m) => (
                  <Row
                    key={m.id}
                    option={m}
                    starred
                    selected={m.id === model}
                    onSelect={() => {
                      onModelChange?.(m.id);
                      setOpen(false);
                    }}
                    onToggleStar={() => toggle(m.id)}
                  />
                ))}
                {starredList.length > 0 && restList.length > 0 && (
                  <div aria-hidden="true" className="my-1 border-t border-[var(--line)]" />
                )}
                {restList.map((m) => (
                  <Row
                    key={m.id}
                    option={m}
                    starred={false}
                    selected={m.id === model}
                    onSelect={() => {
                      onModelChange?.(m.id);
                      setOpen(false);
                    }}
                    onToggleStar={() => toggle(m.id)}
                  />
                ))}
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {supportsEffort && (
        <div className="inline-flex h-9 items-center rounded-md border border-[var(--warning)]/30 bg-[var(--warning)]/8 p-0.5">
          {CHAT_EFFORT_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              disabled={disabled}
              onClick={() => onEffortChange?.(level)}
              className={`h-7 rounded px-2 font-mono text-[10px] uppercase tracking-[0.12em] transition ${
                effort === level
                  ? "bg-[var(--warning)]/20 text-[var(--warning)]"
                  : "text-[var(--ink-faint)] hover:text-[var(--warning)]"
              }`}
            >
              {EFFORT_LABELS[level]}
            </button>
          ))}
        </div>
      )}

      {isUnavailable && (
        <Badge variant="outline" className="text-[10px] text-[var(--ink-faint)]">
          unavailable
        </Badge>
      )}
    </div>
  );
}

function Row({
  option,
  starred,
  selected,
  unavailable,
  onSelect,
  onToggleStar,
}: {
  option: ChatModelOption;
  starred: boolean;
  selected: boolean;
  unavailable?: boolean;
  onSelect: () => void;
  onToggleStar: () => void;
}) {
  const price = formatPricing(option);
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--accent-subtle)] ${
        selected ? "bg-[var(--accent-subtle)]/60" : ""
      } ${unavailable ? "opacity-70" : ""}`}
    >
      <button
        type="button"
        onClick={onToggleStar}
        disabled={unavailable}
        className="grid place-items-center rounded p-0.5 hover:bg-[var(--bg)] disabled:opacity-40"
        aria-label={starred ? "Unstar" : "Star"}
        aria-pressed={starred}
      >
        <StarIcon
          fill={starred ? "var(--warning)" : "none"}
          className={`size-3.5 ${starred ? "text-[var(--warning)]" : "text-[var(--ink-faint)]"}`}
        />
      </button>
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <span className="truncate text-sm font-medium text-[var(--ink)]">{option.label}</span>
        {!unavailable && (
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
            {PROVIDER_LABEL[option.provider] ?? option.provider}
          </span>
        )}
        {unavailable && (
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">unavailable</span>
        )}
        {price && (
          <span className="ml-auto shrink-0 font-mono text-[10px] tabular-nums text-[var(--ink-faint)]">{price}</span>
        )}
        {selected && !unavailable && <CheckIcon className="size-3.5 shrink-0 text-[var(--accent)]" />}
      </button>
    </div>
  );
}
