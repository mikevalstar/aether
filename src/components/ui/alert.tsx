import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import type * as React from "react";

import { cn } from "#/lib/utils";

const alertVariants = cva(
  "relative flex w-full flex-col gap-2.5 rounded-lg border bg-card p-3.5 text-card-foreground shadow-sm",
  {
    variants: {
      variant: {
        default: "border-[var(--line)] [--alert-accent:var(--teal)]",
        destructive: "border-destructive/40 [--alert-accent:var(--destructive)]",
        warning: "border-warning/40 [--alert-accent:var(--warning)]",
        success: "border-success/40 [--alert-accent:var(--success)]",
        info: "border-[var(--teal)]/40 [--alert-accent:var(--teal)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

type AlertVariantProps = VariantProps<typeof alertVariants>;

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & AlertVariantProps) {
  return (
    <div
      data-slot="alert"
      data-variant={variant ?? "default"}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertHeader({
  className,
  children,
  label,
  icon,
  onDismiss,
  ...props
}: React.ComponentProps<"div"> & {
  label?: React.ReactNode;
  icon?: React.ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div data-slot="alert-header" className={cn("flex items-center gap-2.5", className)} {...props}>
      {icon ? <AlertIcon>{icon}</AlertIcon> : null}
      {label ? <AlertLabel>{label}</AlertLabel> : null}
      <AlertRule />
      {children}
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="ml-1 inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-[var(--line)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--alert-accent)]"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function AlertIcon({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-icon"
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded border border-[var(--alert-accent)] text-[var(--alert-accent)] [&>svg]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}

function AlertLabel({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="alert-label"
      className={cn(
        "text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[var(--alert-accent)]",
        className,
      )}
      {...props}
    />
  );
}

function AlertRule({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-rule"
      aria-hidden
      className={cn(
        "h-px flex-1 border-t border-dotted border-[var(--line-strong)] opacity-70",
        className,
      )}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("text-[0.95rem] font-semibold leading-snug tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "rounded border border-[var(--line)] bg-[var(--top-bar-bg)]/60 px-2.5 py-1.5 font-mono text-[0.8rem] leading-relaxed text-muted-foreground [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

function AlertActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-actions"
      className={cn("flex flex-wrap items-center gap-1.5 pt-0.5", className)}
      {...props}
    />
  );
}

const alertActionVariants = cva(
  "inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--alert-accent)] disabled:pointer-events-none disabled:opacity-50 [&>svg]:size-3",
  {
    variants: {
      tone: {
        primary:
          "border-[var(--alert-accent)]/50 bg-[var(--alert-accent)]/10 text-[var(--alert-accent)] hover:bg-[var(--alert-accent)]/15",
        secondary:
          "border-[var(--line-strong)] bg-transparent text-foreground hover:bg-[var(--line)]",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:bg-[var(--line)] hover:text-foreground",
      },
    },
    defaultVariants: { tone: "secondary" },
  },
);

function AlertAction({
  className,
  tone,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof alertActionVariants>) {
  return (
    <button
      type="button"
      data-slot="alert-action"
      className={cn(alertActionVariants({ tone }), className)}
      {...props}
    />
  );
}

export {
  Alert,
  AlertHeader,
  AlertIcon,
  AlertLabel,
  AlertRule,
  AlertTitle,
  AlertDescription,
  AlertActions,
  AlertAction,
};
