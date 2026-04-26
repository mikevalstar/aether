import { cn } from "#/lib/utils";

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Ceil a USD amount to the tenth of a cent (3 decimal places).
 * Uses ceil so we never under-report cost.
 */
export function ceilToTenthCent(usd: number): number {
  return Math.ceil(usd * 1000) / 1000;
}

/**
 * Format a USD value as a plain string, always to the tenth of a cent.
 * Always ceils — we never want to under-report a cost.
 */
export function formatCost(usd: number): string {
  const sign = usd < 0 ? "-" : "";
  const ceiled = ceilToTenthCent(Math.abs(usd));
  return `${sign}$${ceiled.toFixed(3)}`;
}

/**
 * Split a non-negative USD value into the integer "$X" head and the
 * fractional ".XXX" tail (always 3 decimal places, ceil'd).
 */
function splitMoneyParts(usd: number): { sign: string; dollars: string; fraction: string } {
  const sign = usd < 0 ? "-" : "";
  const ceiled = ceilToTenthCent(Math.abs(usd));
  const [dollars, fraction] = ceiled.toFixed(3).split(".");
  return { sign, dollars, fraction: fraction ?? "000" };
}

/**
 * Display a USD amount with a touch of typographic flair: dollars at the
 * full size, the cents portion rendered slightly smaller and softer so the
 * eye lands on the meaningful magnitude first. Always ceils to the tenth
 * of a cent.
 */
export function Money({
  usd,
  className,
  fractionClassName,
}: {
  usd: number;
  className?: string;
  fractionClassName?: string;
}) {
  const { sign, dollars, fraction } = splitMoneyParts(usd);
  return (
    <span className={cn("tabular-nums", className)}>
      {sign}
      <span className="text-[var(--ink-soft)]">$</span>
      {dollars}
      <span className={cn("text-[0.78em] text-[var(--ink-soft)]", fractionClassName)}>.{fraction}</span>
    </span>
  );
}
