import { useAtom } from "jotai";
import { Monitor, Moon, Sun } from "lucide-react";
import { themeModeAtom } from "#/lib/theme";

/**
 * Bordered 28x28 theme toggle — matches the redesign artifact's header
 * affordance: a small framed square that sits next to the ⌘K pill on the
 * right side of the top bar.
 */
export default function ThemeToggle() {
  const [mode, setMode] = useAtom(themeModeAtom);

  function toggleMode() {
    const next = mode === "light" ? "dark" : mode === "dark" ? "auto" : "light";
    setMode(next);
  }

  const label = mode === "auto" ? "Theme: system" : `Theme: ${mode}`;

  const Icon = mode === "auto" ? Monitor : mode === "dark" ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={label}
      title={label}
      className="grid size-7 place-items-center rounded-[var(--radius-xs)] border border-[var(--line)] bg-[var(--top-bar-bg)] text-[var(--ink-soft)] transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--accent-subtle)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="size-3.5" />
    </button>
  );
}
