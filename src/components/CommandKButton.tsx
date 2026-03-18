import { SearchIcon } from "lucide-react";

export default function CommandKButton() {
  function openPalette() {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  }

  return (
    <button
      type="button"
      onClick={openPalette}
      aria-label="Open command palette"
      className="hidden md:flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      <SearchIcon className="size-3" />
      <span>Search...</span>
      <kbd className="ml-1 rounded border border-border bg-background px-1 py-0.5 text-[10px] font-mono">⌘K</kbd>
    </button>
  );
}
