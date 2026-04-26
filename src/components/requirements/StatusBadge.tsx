import { cn } from "#/lib/utils";

const statusConfig: Record<string, { label: string; className: string; dot: string }> = {
  done: {
    label: "Done",
    className: "border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]",
    dot: "bg-[var(--accent)]",
  },
  "in-progress": {
    label: "In Progress",
    className: "border-[var(--warning)]/30 bg-[var(--warning)]/10 text-[var(--warning)]",
    dot: "bg-[var(--warning)]",
  },
  todo: {
    label: "To Do",
    className: "border-[var(--line)] bg-transparent text-[var(--ink-dim)]",
    dot: "bg-[var(--ink-faint)]",
  },
};

type StatusBadgeProps = {
  status: string;
  size?: "sm" | "md";
  className?: string;
};

export function StatusBadge({ status, size = "md", className }: StatusBadgeProps) {
  const config = statusConfig[status.toLowerCase()] ?? {
    label: status,
    className: "border-[var(--line)] bg-transparent text-[var(--ink-dim)]",
    dot: "bg-[var(--ink-faint)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "sm" && "px-2 py-0.5 text-[10px]",
        size === "md" && "px-2.5 py-1 text-xs",
        config.className,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", config.dot)} aria-hidden />
      {config.label}
    </span>
  );
}
