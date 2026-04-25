import { cn } from "#/lib/utils";

type AppLogoProps = {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
};

/**
 * Aether mark — Æ glyph in a rounded square.
 *
 * Uses `currentColor` for the square so the mark follows the surrounding text
 * color (theme-aware via Tailwind's `text-primary`, which maps to `--teal` in
 * both light and dark mode). The glyph itself uses `--primary-foreground` so
 * it stays legible on the teal square in either theme.
 */
export function AppLogo({ className, markClassName, showWordmark = false }: AppLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 64 64"
        role="img"
        aria-label="Aether"
        className={cn("size-8 shrink-0 text-primary", markClassName)}
      >
        <rect width="64" height="64" rx="14" fill="currentColor" />
        <text
          x="32"
          y="46"
          fill="var(--primary-foreground)"
          fontFamily="Fraunces, Georgia, serif"
          fontSize="38"
          fontWeight="700"
          textAnchor="middle"
        >
          Æ
        </text>
      </svg>
      {showWordmark && <span className="text-sm font-bold tracking-wide text-primary">Aether</span>}
    </span>
  );
}
