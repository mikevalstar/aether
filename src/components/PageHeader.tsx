import type { LucideIcon } from "lucide-react";
import { GlowBg } from "#/components/ui/glow-bg";
import { SectionLabel } from "#/components/ui/section-label";

export type GlowConfig = {
  color: string;
  size?: string;
  position?: string;
};

export interface PageHeaderProps {
  /** Lucide icon for the section label */
  icon: LucideIcon;
  /** Section label text (e.g. "Logs", "Usage") */
  label: string;
  /** Color for the section label and title highlight — Tailwind text-color class */
  color?: string;
  /** Main title text (plain part) */
  title: string;
  /** Highlighted word(s) in the title — rendered in the accent color */
  highlight?: string;
  /** Description paragraph below the title */
  description?: string;
  /** Optional action element displayed to the right of the header on large screens */
  action?: React.ReactNode;
  /** Decorative glow backgrounds. Pass an array of configs, or false to disable. */
  glows?: GlowConfig[] | false;
  /** Extra content below the header section (e.g. filters, alerts) */
  children?: React.ReactNode;
}

const DEFAULT_GLOWS: GlowConfig[] = [{ color: "var(--accent)", size: "size-[420px]", position: "-right-48 -top-48" }];

/**
 * Page-level header used at the top of every authenticated route.
 *
 * Redesign notes:
 * - Default accent shifted from `--teal` → `--accent` (single-accent system).
 * - Density tightened: smaller display type and trimmer vertical padding so
 *   list / table content rises into view without scrolling.
 * - A 2px `--accent` rule sits to the left of the title block as the new
 *   "instrument" tic — echoes the focused-row bar in CommandPalette.
 * - A hairline `--line` divider sits beneath the header so the section
 *   label + title read as a tight chip rather than floating in space.
 */
export function PageHeader({
  icon,
  label,
  color = "text-[var(--accent)]",
  title,
  highlight,
  description,
  action,
  glows = DEFAULT_GLOWS,
  children,
}: PageHeaderProps) {
  return (
    <main className="relative overflow-hidden">
      {Array.isArray(glows) &&
        glows.map((glow) => (
          <GlowBg key={`${glow.color}-${glow.position}`} color={glow.color} size={glow.size} position={glow.position} />
        ))}

      <div className="page-wrap relative px-4 pb-10 pt-6 sm:pt-8">
        <section
          className={`mb-6 border-b border-[var(--line)] pb-5 ${
            action ? "flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between" : ""
          }`}
        >
          <div className="relative pl-4">
            <span aria-hidden className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full bg-[var(--accent)]" />
            <SectionLabel icon={icon} color={color}>
              {label}
            </SectionLabel>
            <h1 className="display-title mt-2 mb-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
              {highlight ? (
                <>
                  {title} <span className={color}>{highlight}</span>
                </>
              ) : (
                title
              )}
            </h1>
            {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
          </div>
          {action}
        </section>

        {children}
      </div>
    </main>
  );
}
