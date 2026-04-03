import { SendIcon, SparklesIcon } from "lucide-react";
import { useRef, useState } from "react";
import { ModelEffortSelector } from "#/components/chat/ModelEffortSelector";
import { MentionPopover } from "#/components/mentions/MentionPopover";
import { Button } from "#/components/ui/button";
import { Textarea } from "#/components/ui/textarea";
import { useMentionAutocomplete } from "#/hooks/useMentionAutocomplete";
import { type ChatEffort, type ChatModel } from "#/lib/chat";

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
          <ModelEffortSelector
            model={model}
            effort={effort}
            disabled={disabled}
            modelClassName="min-w-48"
            onModelChange={onModelChange}
            onEffortChange={onEffortChange}
          />
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
