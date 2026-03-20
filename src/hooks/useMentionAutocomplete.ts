import { useCallback, useEffect, useRef, useState } from "react";
import { type ObsidianMentionResult, searchObsidianMentions } from "#/lib/obsidian.functions";

export type MentionState = {
  isOpen: boolean;
  results: ObsidianMentionResult[];
  selectedIndex: number;
};

type UseMentionAutocompleteOptions = {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  /** For controlled textareas — called with the new value after a mention is inserted */
  onValueChange?: (value: string) => void;
};

/**
 * Hook that manages @-mention autocomplete for a textarea.
 *
 * Detects `@` typed at start or after whitespace, queries the vault,
 * and provides keyboard navigation + selection logic.
 */
export function useMentionAutocomplete({ textareaRef, onValueChange }: UseMentionAutocompleteOptions) {
  const [state, setState] = useState<MentionState>({
    isOpen: false,
    results: [],
    selectedIndex: 0,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Track the range of the @query in the textarea so we can replace it on select
  const mentionStartRef = useRef<number>(-1);

  const close = useCallback(() => {
    setState((s) => ({ ...s, isOpen: false, results: [], selectedIndex: 0 }));
    mentionStartRef.current = -1;
  }, []);

  /**
   * Extract the @query from the textarea value given the current caret position.
   * Returns null if the caret is not inside an @-mention query.
   */
  const extractMentionQuery = useCallback((value: string, caretPos: number): string | null => {
    // Walk backwards from caret to find `@`
    let i = caretPos - 1;
    while (i >= 0) {
      const ch = value[i];
      if (ch === "@") {
        // Valid if @ is at start or preceded by whitespace
        const prev = value[i - 1];
        if (i === 0 || (prev !== undefined && /\s/.test(prev))) {
          mentionStartRef.current = i;
          return value.slice(i + 1, caretPos);
        }
        return null;
      }
      // Stop at whitespace — no @ found in this "word"
      if (ch !== undefined && /\s/.test(ch)) return null;
      i--;
    }
    return null;
  }, []);

  /** Called on every input/change in the textarea */
  const handleInput = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const value = textarea.value;
    const caretPos = textarea.selectionStart;
    const query = extractMentionQuery(value, caretPos);

    if (query === null) {
      close();
      return;
    }

    // Fetch results — immediate for empty query (just `@`), debounced otherwise
    const fetchResults = () => {
      searchObsidianMentions({ data: { query } })
        .then((results) => {
          setState((s) => ({
            ...s,
            isOpen: true,
            results,
            selectedIndex: 0,
          }));
        })
        .catch(() => {
          // silently fail
        });
    };

    if (query.length === 0) {
      // Show popover immediately and fetch recent notes
      setState((s) => ({
        ...s,
        isOpen: true,
        selectedIndex: 0,
      }));
      fetchResults();
      return;
    }

    // Debounced search for non-empty queries
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchResults, 200);
  }, [textareaRef, extractMentionQuery, close]);

  /** Select a mention result and insert it into the textarea */
  const selectMention = useCallback(
    (result: ObsidianMentionResult) => {
      const textarea = textareaRef.current;
      if (!textarea || mentionStartRef.current < 0) return;

      const value = textarea.value;
      const start = mentionStartRef.current;
      const end = textarea.selectionStart;

      // Replace @query with @`filename`
      const filename = result.relativePath.replace(/\.md$/, "");
      const insertion = `@\`${filename}\` `;
      const newValue = value.slice(0, start) + insertion + value.slice(end);

      // For controlled textareas, call the callback; for uncontrolled, use native setter
      if (onValueChange) {
        onValueChange(newValue);
      } else {
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
        if (nativeSetter) {
          nativeSetter.call(textarea, newValue);
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
        } else {
          textarea.value = newValue;
        }
      }

      // Move cursor after the insertion
      const newCursorPos = start + insertion.length;
      requestAnimationFrame(() => {
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      });

      close();
    },
    [textareaRef, onValueChange, close],
  );

  /**
   * Keyboard handler to wire onto the textarea.
   * Returns true if the event was handled (caller should preventDefault).
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!state.isOpen || state.results.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          e.stopPropagation();
          setState((s) => ({
            ...s,
            selectedIndex: (s.selectedIndex + 1) % s.results.length,
          }));
          break;
        case "ArrowUp":
          e.preventDefault();
          e.stopPropagation();
          setState((s) => ({
            ...s,
            selectedIndex: (s.selectedIndex - 1 + s.results.length) % s.results.length,
          }));
          break;
        case "Enter":
        case "Tab": {
          e.preventDefault();
          e.stopPropagation();
          const selected = state.results[state.selectedIndex];
          if (selected) selectMention(selected);
          break;
        }
        case "Escape":
          e.preventDefault();
          e.stopPropagation();
          close();
          break;
      }
    },
    [state.isOpen, state.results, state.selectedIndex, selectMention, close],
  );

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    mentionState: state,
    handleMentionInput: handleInput,
    handleMentionKeyDown: handleKeyDown,
    selectMention,
    closeMention: close,
  };
}
