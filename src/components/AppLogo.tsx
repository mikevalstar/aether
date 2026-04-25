import { cn } from "#/lib/utils";

type AppLogoProps = {
  className?: string;
  markClassName?: string;
};

/**
 * Aether mark — Æ glyph in a rounded square.
 *
 * Uses `currentColor` for the square so the mark follows the surrounding text
 * color (theme-aware via Tailwind's `text-primary`, which maps to `--accent` in
 * both light and dark mode). The glyph itself uses `--primary-foreground` so
 * it stays legible on the accent square in either theme.
 *
 * Design note: per the redesign brief we render the mark on its own — no
 * "Aether" wordmark beside it (mobile or desktop). The square is the brand.
 */
export function AppLogo({ className, markClassName }: AppLogoProps) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <svg viewBox="0 0 64 64" role="img" aria-label="Aether" className={cn("size-8 shrink-0 text-primary", markClassName)}>
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
    </span>
  );
}
