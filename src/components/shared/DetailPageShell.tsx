import { Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { GlowConfig } from "#/components/PageHeader";
import { GlowBg } from "#/components/ui/glow-bg";
import { SectionLabel } from "#/components/ui/section-label";

export type DetailExternalLink =
  | { kind: "external"; href: string; title?: string }
  | { kind: "internal"; to: string; params?: Record<string, string>; title?: string };

export interface DetailPageShellProps {
  /** Lucide icon for the section label */
  icon: LucideIcon;
  /** Section label text (e.g. "Task History") */
  label: string;
  /** Tailwind text-color class for label + accent. Defaults to --accent. */
  color?: string;
  /** Page title — usually the entity's name */
  title: string;
  /** "Back to ..." link target (route string) */
  backTo: string;
  /** "Back to ..." label, e.g. "Back to tasks" */
  backLabel: string;
  /** Optional external/Obsidian link rendered next to the title */
  externalLink?: DetailExternalLink;
  /** Decorative glow backgrounds. Pass an array, or false to disable. */
  glows?: GlowConfig[] | false;
  /** Detail body */
  children: ReactNode;
}

const DEFAULT_GLOWS: GlowConfig[] = [{ color: "var(--accent)", size: "size-[420px]", position: "-right-48 -top-48" }];

/**
 * Detail page wrapper used by tasks/workflows/triggers single-item views.
 *
 * Mirrors the visual language of `PageHeader` (glow, accent rail, hairline
 * divider, display title) but is shaped for "single entity" pages: a back
 * link, an icon-tagged section label, and an optional external link beside
 * the title.
 */
export function DetailPageShell({
  icon,
  label,
  color = "text-[var(--accent)]",
  title,
  backTo,
  backLabel,
  externalLink,
  glows = DEFAULT_GLOWS,
  children,
}: DetailPageShellProps) {
  return (
    <main className="relative overflow-hidden">
      {Array.isArray(glows) &&
        glows.map((glow) => (
          <GlowBg key={`${glow.color}-${glow.position}`} color={glow.color} size={glow.size} position={glow.position} />
        ))}

      <div className="page-wrap relative px-4 pb-16 pt-6 sm:pt-8">
        <Link
          to={backTo}
          className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>

        <section className="mb-6 border-b border-[var(--line)] pb-5">
          <div className="relative pl-4">
            <span aria-hidden className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full bg-[var(--accent)]" />
            <SectionLabel icon={icon} color={color}>
              {label}
            </SectionLabel>
            <h1 className="display-title mt-2 mb-1.5 flex items-center gap-3 text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
              {externalLink && <ExternalLinkIcon link={externalLink} />}
            </h1>
          </div>
        </section>

        {children}
      </div>
    </main>
  );
}

const externalLinkClass = "text-[var(--ink-soft)] transition-colors hover:text-[var(--accent)]";

function ExternalLinkIcon({ link }: { link: DetailExternalLink }) {
  if (link.kind === "external") {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={externalLinkClass}
        title={link.title ?? "Open"}
      >
        <ExternalLink className="size-5" />
      </a>
    );
  }

  return (
    <Link to={link.to} params={link.params} className={externalLinkClass} title={link.title ?? "Open"}>
      <ExternalLink className="size-5" />
    </Link>
  );
}
