import { useRef, useState } from "react";
import { ModelSelector } from "#/components/chat/ModelSelector";
import { MentionPopover } from "#/components/mentions/MentionPopover";
import { Button } from "#/components/ui/button";
import { useMentionAutocomplete } from "#/hooks/useMentionAutocomplete";
import type { ChatEffort, ChatModel } from "#/lib/chat/chat";

export interface ChatEmptyStateProps {
  model: ChatModel;
  effort?: ChatEffort;
  modelLabel?: string;
  disabled?: boolean;
  onModelChange?: (model: string) => void;
  onEffortChange?: (effort: string) => void;
  onSend?: (message: string) => void;
}

export function ChatEmptyState({
  model,
  effort = "low",
  modelLabel = "Claude",
  disabled = false,
  onModelChange,
  onEffortChange,
  onSend,
}: ChatEmptyStateProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mentionState, handleMentionInput, handleMentionKeyDown, selectMention } = useMentionAutocomplete({
    textareaRef,
    onValueChange: setMessage,
  });
  function handleSend() {
    const trimmed = message.trim();
    if (!trimmed) return;
    onSend?.(trimmed);
    setMessage("");
  }

  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="w-full max-w-2xl">
        <div className="mb-4 flex flex-wrap items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
          <span className="text-[var(--ink-soft)]">RUN_NEW</span>
          <span className="h-3 w-px bg-[var(--line)]" />
          <span className="inline-flex items-center gap-1.5 rounded border border-[var(--accent)]/40 bg-[var(--accent-subtle)] px-1.5 py-0.5 text-[var(--accent)]">
            <span className="size-1.5 rounded-full bg-[var(--accent)]" />
            READY
          </span>
          <span className="text-[var(--ink-soft)]">{modelLabel}</span>
        </div>

        <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] lg:text-5xl">
          Dispatch instruction.
        </h1>
        <p className="mt-3 max-w-md text-base text-[var(--ink-soft)]">
          Ask anything. Aether will plan, run tools, and write back to your vault as needed.
        </p>

        <div className="mt-6 flex items-center gap-2">
          <ModelSelector
            model={model}
            effort={effort}
            modelLabel={modelLabel}
            disabled={disabled}
            onModelChange={onModelChange}
            onEffortChange={onEffortChange}
          />
        </div>

        <div className="relative mt-4 rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] p-1 transition-shadow focus-within:border-[var(--accent)]/60 focus-within:ring-2 focus-within:ring-[var(--accent)]/20">
          <div className="flex items-start gap-2 px-3 py-2.5">
            <span className="mt-0.5 font-mono text-base font-bold text-[var(--accent)]">{">"}</span>
            <MentionPopover state={mentionState} onSelect={selectMention} />
            <textarea
              ref={textareaRef}
              // biome-ignore lint/a11y/noAutofocus: chat is the primary action on this page
              autoFocus
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (mentionState.isOpen && mentionState.results.length > 0) {
                  if (["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(event.key)) {
                    handleMentionKeyDown(event as React.KeyboardEvent<HTMLTextAreaElement>);
                    return;
                  }
                }
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              onInput={handleMentionInput}
              onClick={handleMentionInput}
              placeholder="dispatch instruction…"
              rows={3}
              className="aui-composer-input min-h-20 w-full resize-none bg-transparent font-mono text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
            />
          </div>
          <div className="flex items-center justify-between border-t border-[var(--line)] px-2 py-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              ⏎ exec · ⇧⏎ newline
            </span>
            <Button
              type="button"
              size="sm"
              onClick={handleSend}
              disabled={disabled || message.trim().length === 0}
              className="h-7 rounded font-mono text-[11px] font-bold uppercase tracking-[0.14em] bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)]"
            >
              EXEC ↵
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
