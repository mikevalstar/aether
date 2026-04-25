import { SearchIcon } from "lucide-react";

/**
 * ⌘K affordance shown in the header.
 *
 * Raycast-styled: subtle pill with the search glyph, a faint "Search…"
 * label, and a mono kbd chip that tracks the OS modifier. Hovering tints
 * the chrome with `--accent-subtle` so the entry point telegraphs that it
 * opens the accent-themed palette.
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
      className="group hidden md:flex items-center gap-2 rounded-md border border-border bg-muted/40 pl-2 pr-1.5 py-1 text-xs text-muted-foreground transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--accent-subtle)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <SearchIcon className="size-3.5 transition-colors group-hover:text-[var(--accent)]" />
      <span className="font-medium tracking-tight">Search…</span>
      <kbd className="ml-1 inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground group-hover:border-[var(--accent)]/30 group-hover:text-[var(--accent)]">
        <span className="text-[11px] leading-none">⌘</span>
        <span className="leading-none">K</span>
      </kbd>
    </button>
  );
}
