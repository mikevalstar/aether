import type { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  /** Lucide icon displayed above the title */
  icon: LucideIcon;
  /** Main heading text */
  title: string;
  /** Description below the title */
  description?: React.ReactNode;
  /** Action buttons or links below the description */
  action?: React.ReactNode;
  /** Footer content (e.g. stats) below the action */
  footer?: React.ReactNode;
  /**
   * Visual variant:
   * - "dashed" — compact line-art border box (for inline empty lists)
   * - "centered" — full-height centered layout with accent icon mark (for page-level states)
   */
  variant?: "dashed" | "centered";
  /** Accent color for the centered variant icon mark (defaults to `var(--accent)`) */
  accentColor?: string;
}

/**
 * Empty-state placeholder.
 *
 * Redesign notes:
 * - Line-art treatment: outlined accent-bordered square holds the icon —
 *   echoes the æ brand mark instead of a solid filled circle.
 * - "dashed" variant tightened (p-12 → p-8) and now uses corner ticks for a
 *   schematic / instrument-panel feel rather than a fully dashed border.
 * - Default `accentColor` switched from the dead `--coral` to `--accent`.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  footer,
  variant = "dashed",
  accentColor = "var(--accent)",
}: EmptyStateProps) {
  if (variant === "centered") {
    return (
      <div className="flex min-h-[420px] items-center justify-center px-6 py-10 text-center">
        <div className="max-w-lg">
          <div
            className="mx-auto flex size-14 items-center justify-center rounded-md border-[1.5px]"
            style={{
              borderColor: accentColor,
              backgroundColor: `oklch(from ${accentColor} l c h / 0.06)`,
              color: accentColor,
            }}
          >
            <Icon className="size-6" />
          </div>
          <h2 className="mt-5 text-xl font-semibold text-[var(--ink)] tracking-tight">{title}</h2>
          {description && (
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--ink-soft)]">{description}</p>
          )}
          {action && <div className="mt-6 flex items-center justify-center gap-3">{action}</div>}
          {footer && (
            <div className="mt-6 flex items-center justify-center gap-6 text-sm text-[var(--ink-soft)]">{footer}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center rounded-md border border-[var(--line)] bg-[oklch(from_var(--accent)_l_c_h_/_0.02)] p-8 text-center">
      {/* Schematic corner ticks — accent-tinted, instrument feel. */}
      <CornerTick className="left-2 top-2" lines="border-l-[1.5px] border-t-[1.5px]" />
      <CornerTick className="right-2 top-2" lines="border-r-[1.5px] border-t-[1.5px]" />
      <CornerTick className="left-2 bottom-2" lines="border-l-[1.5px] border-b-[1.5px]" />
      <CornerTick className="right-2 bottom-2" lines="border-r-[1.5px] border-b-[1.5px]" />

      <div className="mb-3 flex size-10 items-center justify-center rounded-md border-[1.5px] border-[var(--accent)]/40 text-[var(--accent)]">
        <Icon className="size-5" />
      </div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function CornerTick({ className, lines }: { className: string; lines: string }) {
  return (
    <span aria-hidden className={`pointer-events-none absolute size-3 border-[var(--accent)]/40 ${lines} ${className}`} />
  );
}
