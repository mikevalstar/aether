import { SendIcon, SparklesIcon } from "lucide-react";
import { useRef, useState } from "react";
import { MentionPopover } from "#/components/mentions/MentionPopover";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { useMentionAutocomplete } from "#/hooks/useMentionAutocomplete";
import { CHAT_EFFORT_LEVELS, CHAT_MODELS, type ChatEffort, type ChatModel } from "#/lib/chat";

const EFFORT_LABELS: Record<ChatEffort, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

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
  const currentModelSupportsEffort = CHAT_MODELS.find((m) => m.id === model)?.supportsEffort ?? false;

  function handleSend() {
    const trimmed = message.trim();
    if (!trimmed) return;
    onSend?.(trimmed);
    setMessage("");
  }

  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="w-full max-w-xl space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-[var(--teal-subtle)]">
            <SparklesIcon className="size-8 text-[var(--teal)]" />
          </div>
          <h2 className="display-title text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
            Start a conversation
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-base text-[var(--ink-soft)]">
            Ask anything. {modelLabel} is ready to help.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Select value={model} onValueChange={(value) => onModelChange?.(value)} disabled={disabled}>
            <SelectTrigger className="w-auto min-w-48 border-[var(--teal)]/30 bg-[var(--teal-subtle)] font-semibold text-[var(--teal)]">
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
              <SelectTrigger className="w-auto min-w-24 border-[var(--coral)]/30 bg-[var(--coral)]/8 font-semibold text-[var(--coral)] hover:bg-[var(--coral)]/12">
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
        </div>

        <div className="relative">
          <MentionPopover state={mentionState} onSelect={selectMention} />
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              // Let mention popover handle keys first
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
            placeholder="Ask something..."
            className="min-h-32 rounded-xl border-2 border-[var(--line)] bg-[var(--bg)] px-4 py-4 pr-14 text-base transition-colors focus:border-[var(--teal)]"
          />
          <Button
            type="button"
            size="icon-sm"
            onClick={handleSend}
            disabled={disabled || message.trim().length === 0}
            className="absolute right-3 bottom-3 rounded-lg bg-[var(--teal)] text-white hover:bg-[var(--teal-hover)]"
          >
            <SendIcon className="size-4" />
          </Button>
        </div>
        <p className="text-center text-xs text-[var(--ink-soft)]">Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  );
}
