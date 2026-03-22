import { ChevronDownIcon, FileDownIcon, MenuIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { CHAT_EFFORT_LEVELS, CHAT_MODELS, type ChatEffort, type ChatModel } from "#/lib/chat";

export interface ChatHeaderProps {
  title: string;
  model: ChatModel;
  effort: ChatEffort;
  inputTokens?: number;
  outputTokens?: number;
  costLabel?: string;
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

const EFFORT_LABELS: Record<ChatEffort, string> = {
  low: "Low",
  medium: "Med",
  high: "High",
};

export function ChatHeader({
  title,
  model,
  effort,
  inputTokens = 0,
  outputTokens = 0,
  costLabel = "$0.0000",
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
  const currentModelSupportsEffort = CHAT_MODELS.find((m) => m.id === model)?.supportsEffort ?? false;
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
          <Select value={model} onValueChange={(value) => onModelChange?.(value)} disabled={disabled}>
            <SelectTrigger className="min-w-0 border-[var(--teal)]/30 bg-[var(--teal-subtle)] font-semibold text-[var(--teal)] hover:bg-[var(--teal-subtle)] lg:min-w-40">
              <SelectValue placeholder="Choose model" />
            </SelectTrigger>
            <SelectContent>
              {CHAT_MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.label}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {m.description}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {currentModelSupportsEffort && (
            <Select value={effort} onValueChange={(value) => onEffortChange?.(value)} disabled={disabled}>
              <SelectTrigger className="w-20 border-[var(--coral)]/30 bg-[var(--coral)]/8 font-semibold text-[var(--coral)] hover:bg-[var(--coral)]/12">
                <SelectValue placeholder="Effort" />
              </SelectTrigger>
              <SelectContent>
                {CHAT_EFFORT_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {EFFORT_LABELS[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

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
        className={`grid transition-[grid-template-rows] duration-150 ease-out lg:hidden ${mobileExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Select value={model} onValueChange={(value) => onModelChange?.(value)} disabled={disabled}>
              <SelectTrigger className="min-w-0 flex-1 border-[var(--teal)]/30 bg-[var(--teal-subtle)] font-semibold text-[var(--teal)] hover:bg-[var(--teal-subtle)]">
                <SelectValue placeholder="Choose model" />
              </SelectTrigger>
              <SelectContent>
                {CHAT_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="font-medium">{m.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {currentModelSupportsEffort && (
              <Select value={effort} onValueChange={(value) => onEffortChange?.(value)} disabled={disabled}>
                <SelectTrigger className="w-20 border-[var(--coral)]/30 bg-[var(--coral)]/8 font-semibold text-[var(--coral)] hover:bg-[var(--coral)]/12">
                  <SelectValue placeholder="Effort" />
                </SelectTrigger>
                <SelectContent>
                  {CHAT_EFFORT_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {EFFORT_LABELS[level]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

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
            <div className="flex items-center gap-3 pt-2 text-xs text-[var(--ink-soft)]">
              <span>
                <span className="font-medium text-[var(--ink)]">{inputTokens.toLocaleString()}</span> in
              </span>
              <span className="text-[var(--line)]">/</span>
              <span>
                <span className="font-medium text-[var(--ink)]">{outputTokens.toLocaleString()}</span> out
              </span>
              <span className="text-[var(--line)]">/</span>
              <span className="font-medium text-[var(--teal)]">{costLabel}</span>
            </div>
          )}
        </div>
      </div>

      {/* Desktop: stats row */}
      {showStats && (
        <div className="mt-2 hidden items-center gap-3 text-xs text-[var(--ink-soft)] lg:flex">
          <span>
            <span className="font-medium text-[var(--ink)]">{inputTokens.toLocaleString()}</span> input tokens
          </span>
          <span className="text-[var(--line)]">/</span>
          <span>
            <span className="font-medium text-[var(--ink)]">{outputTokens.toLocaleString()}</span> output tokens
          </span>
          <span className="text-[var(--line)]">/</span>
          <span className="font-medium text-[var(--teal)]">{costLabel}</span>
        </div>
      )}
    </div>
  );
}
