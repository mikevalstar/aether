import { useRef } from "react";
import { MentionPopover } from "#/components/mentions/MentionPopover";
import { Textarea } from "#/components/ui/textarea";
import { useMentionAutocomplete } from "#/hooks/useMentionAutocomplete";
import { cn } from "#/lib/utils";

export type MentionTextareaProps = Omit<React.ComponentProps<"textarea">, "onChange"> & {
  /** Called with the new string value on every change (typing or mention insertion) */
  onValueChange: (value: string) => void;
};

/**
 * A Textarea with built-in @-mention autocomplete for Obsidian vault files.
 *
 * Typing `@` shows a popover of matching vault files. Selecting one inserts
 * `@\`filename\`` at the cursor. Supports arrow-key navigation, Enter/Tab
 * to confirm, and Escape to dismiss.
 */
export function MentionTextarea({ onValueChange, className, ...props }: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mentionState, handleMentionInput, handleMentionKeyDown, selectMention } = useMentionAutocomplete({
    textareaRef,
    onValueChange,
  });

  return (
    <div className="relative">
      <MentionPopover state={mentionState} onSelect={selectMention} />
      <Textarea
        ref={textareaRef}
        className={cn(className)}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={(e) => {
          if (mentionState.isOpen && mentionState.results.length > 0) {
            if (["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(e.key)) {
              handleMentionKeyDown(e as React.KeyboardEvent<HTMLTextAreaElement>);
            }
          }
        }}
        onInput={handleMentionInput}
        onClick={handleMentionInput}
        {...props}
      />
    </div>
  );
}
