import { Search } from "lucide-react";

/**
 * ⌘K affordance shown in the header.
 *
 * Compact bordered pill matching the redesign artifact: "⌕ THREADS" label
 * with an inline ⌘K kbd chip. Hovering tints the pill with `--accent-subtle`
 * to telegraph that it opens the accent-themed palette.
 */
export default function CommandKButton() {
  function openPalette() {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  }

  return (
    <button
      type="button"
      onClick={openPalette}
      aria-label="Open command palette"
      className="group hidden h-7 items-center gap-1.5 rounded-[var(--radius-xs)] border border-[var(--line)] bg-[var(--top-bar-bg)] pl-2 pr-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--ink-soft)] transition-all duration-150 ease-out hover:border-[var(--accent)]/40 hover:bg-[var(--accent-subtle)] hover:text-[var(--ink)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:inline-flex"
    >
      <Search className="size-3 transition-colors group-hover:text-[var(--accent)]" aria-hidden />
      <span>Threads</span>
      <kbd className="ml-1 inline-flex items-center rounded-[3px] bg-[var(--bg)] px-1 py-px font-mono text-[9.5px] font-medium tracking-normal text-[var(--ink-dim)] group-hover:text-[var(--accent)]">
        ⌘K
      </kbd>
    </button>
  );
}
