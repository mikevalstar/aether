import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "#/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-transparent px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        // Solid — use for SOLID ACCENT-style emphasis chips
        default:
          "bg-primary text-primary-foreground font-semibold uppercase tracking-wider [a&]:hover:bg-[var(--accent-hover)]",
        // Subtle accent surface — soft alt
        secondary: "bg-secondary text-secondary-foreground border-[var(--line)] [a&]:hover:bg-secondary/90",
        // Outlined error (matches design's "ERROR" chip)
        destructive:
          "border-destructive/40 bg-[var(--destructive-subtle)] text-destructive font-semibold uppercase tracking-wider [a&]:hover:bg-destructive/15",
        // Outlined success (matches design's "SUCCESS" chip)
        success:
          "border-[var(--success)]/40 bg-[var(--success-subtle)] text-[var(--success)] font-semibold uppercase tracking-wider",
        // Outlined warning (matches design's "RUNNING" chip)
        warning:
          "border-[var(--warning)]/40 bg-[var(--warning-subtle)] text-[var(--warning)] font-semibold uppercase tracking-wider",
        // Outlined info / "NEW" chip
        info: "border-[var(--accent)]/40 bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold uppercase tracking-wider",
        // Solid green ("SOLID ADD")
        "solid-success":
          "bg-[var(--success)] text-white font-semibold uppercase tracking-wider [a&]:hover:bg-[var(--success)]/90",
        // Neutral chip — token style ("claude-haiku-4-5", "3 fields", "#daily").
        // Quieter than status badges: smaller, no uppercase, normal weight.
        outline: "border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink-soft)] [a&]:hover:bg-[var(--bg)]",
        // Model identifier chip ("claude-haiku-4-5", "kimi-k2.5") — outline + mono.
        "model-name":
          "border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink-soft)] font-mono normal-case [a&]:hover:bg-[var(--bg)]",
        // Plain neutral, no border ("DRAFT")
        ghost:
          "bg-[var(--muted)] text-[var(--ink-soft)] font-semibold uppercase tracking-wider [a&]:hover:bg-[var(--muted)]/80",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return <Comp data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
