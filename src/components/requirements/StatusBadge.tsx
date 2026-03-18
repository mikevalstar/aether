import { cn } from "#/lib/utils";

const statusConfig: Record<string, { label: string; className: string; dot: string }> = {
  done: {
    label: "Done",
    className: "border-[var(--teal)]/30 bg-[var(--teal)]/10 text-[var(--teal)]",
    dot: "bg-[var(--teal)]",
  },
  "in-progress": {
    label: "In Progress",
    className: "border-[var(--coral)]/30 bg-[var(--coral)]/10 text-[var(--coral)]",
    dot: "bg-[var(--coral)]",
  },
  todo: {
    label: "To Do",
    className: "border-[var(--line)] bg-[var(--bg)] text-[var(--ink-soft)]",
    dot: "bg-[var(--ink-soft)]/40",
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
    className: "border-[var(--line)] bg-[var(--bg)] text-[var(--ink-soft)]",
    dot: "bg-[var(--ink-soft)]/40",
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
