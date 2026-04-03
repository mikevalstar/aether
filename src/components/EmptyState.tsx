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
   * - "dashed" — compact dashed border box (for inline empty lists)
   * - "centered" — full-height centered layout with accent icon circle (for page-level states)
   */
  variant?: "dashed" | "centered";
  /** Accent color for the centered variant icon circle (e.g. "var(--teal)") */
  accentColor?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  footer,
  variant = "dashed",
  accentColor = "var(--coral)",
}: EmptyStateProps) {
  if (variant === "centered") {
    return (
      <div className="flex min-h-[480px] items-center justify-center px-6 py-10 text-center">
        <div className="max-w-lg">
          <div
            className="mx-auto flex size-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `oklch(from ${accentColor} l c h / 0.1)`, color: accentColor }}
          >
            <Icon className="size-6" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-[var(--ink)]">{title}</h2>
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
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
      <Icon className="mb-4 size-10 text-muted-foreground" />
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
