import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import type { DashboardUsage } from "#/lib/dashboard.functions";

type Props = {
  usage: DashboardUsage;
};

function formatCost(value: number): string {
  if (value === 0) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 1 ? 3 : 2,
    maximumFractionDigits: value < 1 ? 3 : 2,
  }).format(value);
}

export function UsageStat({ usage }: Props) {
  return (
    <Link
      to="/usage"
      className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-4 no-underline transition-colors hover:border-[var(--teal)]/30"
    >
      <div className="flex size-8 items-center justify-center rounded-md bg-[var(--teal-subtle)] text-[var(--teal)]">
        <Zap className="size-4" />
      </div>
      <div className="flex flex-1 items-center gap-6">
        <div>
          <p className="text-sm font-semibold tabular-nums text-foreground">{formatCost(usage.todayCostUsd)}</p>
          <p className="text-[11px] text-muted-foreground">
            today &middot; {usage.todayEvents} {usage.todayEvents === 1 ? "call" : "calls"}
          </p>
        </div>
        <div className="h-6 w-px bg-border" />
        <div>
          <p className="text-sm font-semibold tabular-nums text-foreground">{formatCost(usage.weekCostUsd)}</p>
          <p className="text-[11px] text-muted-foreground">
            7-day &middot; {usage.weekEvents} {usage.weekEvents === 1 ? "call" : "calls"}
          </p>
        </div>
      </div>
    </Link>
  );
}
