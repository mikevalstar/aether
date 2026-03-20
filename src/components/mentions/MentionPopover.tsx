import { BookOpen, FolderOpen } from "lucide-react";
import type { FC } from "react";
import type { MentionState } from "#/hooks/useMentionAutocomplete";
import type { ObsidianMentionResult } from "#/lib/obsidian.functions";
import { cn } from "#/lib/utils";

type MentionPopoverProps = {
  state: MentionState;
  onSelect: (result: ObsidianMentionResult) => void;
};

export const MentionPopover: FC<MentionPopoverProps> = ({ state, onSelect }) => {
  if (!state.isOpen || state.results.length === 0) return null;

  return (
    <div
      className="absolute bottom-full left-0 z-50 mb-1 w-80 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
      role="listbox"
      // Prevent clicks from blurring the textarea
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="max-h-52 overflow-y-auto py-1">
        {state.results.map((result, index) => (
          <button
            key={result.relativePath}
            type="button"
            className={cn(
              "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm outline-none transition-colors",
              index === state.selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
            )}
            onClick={() => onSelect(result)}
          >
            <BookOpen className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate font-medium">{result.title}</span>
            {result.folder && (
              <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <FolderOpen className="size-3" />
                {result.folder}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
