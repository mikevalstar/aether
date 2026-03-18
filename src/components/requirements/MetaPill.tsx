import type { ReactNode } from "react";
import { cn } from "#/lib/utils";

type MetaPillProps = {
  icon: ReactNode;
  children: ReactNode;
  className?: string;
};

export function MetaPill({ icon, children, className }: MetaPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--bg)] px-2.5 py-1 text-xs text-[var(--ink-soft)]",
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
