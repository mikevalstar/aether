import type { LucideIcon } from "lucide-react";

export interface StatCardProps {
  /** Short uppercase label */
  label: string;
  /** Primary display value */
  value: string;
  /** Supporting detail text */
  detail: string;
  /** Lucide icon */
  icon: LucideIcon;
  /** CSS color value or var reference (e.g. "var(--accent)") */
  color: string;
}

export function StatCard({ label, value, detail, icon: Icon, color }: StatCardProps) {
  return (
    <article className="surface-card relative overflow-hidden p-5" style={{ borderTopColor: color, borderTopWidth: 2 }}>
      <div className="flex items-center gap-2">
        <div
          className="inline-flex size-7 items-center justify-center rounded-md"
          style={{
            backgroundColor: `oklch(from ${color} l c h / 0.1)`,
            color,
          }}
        >
          <Icon className="size-3.5" strokeWidth={2} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </article>
  );
}
