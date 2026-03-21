import { formatDistanceToNow } from "date-fns";
import { AlertCircle, CheckCircle2, Wallet } from "lucide-react";
import type { AetherPluginClient, PluginWidget } from "../types";
import type { BalanceResult } from "./lib/types";

function BalancesWidget({
  data,
}: {
  ctx: { pluginId: string; options: Record<string, unknown> };
  data: Record<string, unknown>;
}) {
  const configured = data.configured as boolean;
  const error = data.error as string | undefined;
  const balances = (data.balances as BalanceResult[]) ?? [];

  if (!configured) {
    return (
      <div className="surface-card rounded-lg p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Wallet className="size-4" />
          API Balances
        </div>
        <p className="text-xs text-muted-foreground">
          No services configured. Go to Settings &gt; Plugins &gt; API Balances to set up.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-card rounded-lg p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Wallet className="size-4" />
          API Balances
        </div>
        <p className="text-xs text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="surface-card rounded-lg p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Wallet className="size-4" />
        API Balances
      </div>

      {balances.length === 0 ? (
        <p className="text-xs text-muted-foreground">No balances to display</p>
      ) : (
        <ul className="space-y-2">
          {balances.map((b) => (
            <li key={b.service} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {b.error ? (
                  <AlertCircle className="size-3 shrink-0 text-destructive" />
                ) : (
                  <CheckCircle2 className="size-3 shrink-0 text-emerald-500" />
                )}
                <span className="text-xs font-medium truncate">{b.serviceName}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {b.error ? (
                  <span className="text-[10px] text-destructive truncate max-w-[120px]" title={b.error}>
                    {b.error}
                  </span>
                ) : (
                  <>
                    <span className="text-xs font-semibold tabular-nums">${b.balance?.toFixed(2) ?? "—"}</span>
                    <span className="text-[10px] text-muted-foreground/70">
                      {formatDistanceToNow(new Date(b.lastChecked), { addSuffix: true })}
                    </span>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const balancesWidget: PluginWidget = {
  id: "balances",
  label: "API Balances",
  size: "quarter",
  component: BalancesWidget,
};

export const apiBalancesClient: AetherPluginClient = {
  widgets: [balancesWidget],
  commands: [
    {
      label: "API Balances Settings",
      icon: Wallet,
      route: "/settings/plugins/api_balances",
    },
  ],
};
