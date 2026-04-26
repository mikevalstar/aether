import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "#/components/ui/card";
import { cn } from "#/lib/utils";

type WidgetCardProps = {
  icon?: LucideIcon;
  title: ReactNode;
  /** Optional right-aligned slot in the header — typically a badge, link, or count. */
  action?: ReactNode;
  /** Additional class names applied to the underlying Card. */
  className?: string;
  /** Hide the header row entirely (rare — use only when the widget renders its own custom header). */
  noHeader?: boolean;
  children: ReactNode;
};

/**
 * Shared chrome for dashboard widgets — built on the `Card` primitive so every
 * tile (built-in + plugin-contributed) sits in the same surface, line color,
 * radius, and hover treatment. The header is a tight uppercase eyebrow with
 * an optional icon and right-side action slot, matching the Console redesign.
 */
export function WidgetCard({ icon: Icon, title, action, className, noHeader, children }: WidgetCardProps) {
  return (
    <Card className={cn("h-full gap-3", className)}>
      {!noHeader && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {Icon && <Icon className="size-4" />}
            <span className="truncate">{title}</span>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </Card>
  );
}
