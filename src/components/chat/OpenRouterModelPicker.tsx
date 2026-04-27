import { CheckIcon, PlusIcon, RefreshCwIcon, TrashIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { toast } from "#/components/ui/sonner";
import { listOpenRouterModels, type OpenRouterCatalogModel } from "#/lib/chat/openrouter-catalog.functions";
import {
  addOpenRouterModel,
  listSelectedOpenRouterModels,
  refreshOpenRouterPrices,
  removeOpenRouterModel,
  type SelectedOpenRouterModel,
} from "#/lib/chat/openrouter-selection.functions";

function formatPrice(inputUsd: number | null, outputUsd: number | null) {
  if (inputUsd == null || outputUsd == null) return null;
  const fmt = (n: number) => {
    if (n === 0) return "0";
    // Pick a decimal precision that preserves at least 2 significant digits
    // for cheap models (e.g. $0.044/M) without showing trailing FP noise.
    const dp = n >= 10 ? 1 : n >= 1 ? 2 : n >= 0.1 ? 2 : n >= 0.01 ? 3 : 4;
    return n.toFixed(dp).replace(/\.?0+$/, "");
  };
  return `$${fmt(inputUsd)}/${fmt(outputUsd)}`;
}

export function OpenRouterModelPicker() {
  const [catalog, setCatalog] = useState<OpenRouterCatalogModel[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedOpenRouterModel[]>([]);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listOpenRouterModels(), listSelectedOpenRouterModels()])
      .then(([cat, sel]) => {
        if (cancelled) return;
        setCatalog(cat);
        setSelected(sel);
        if (cat.length === 0) setCatalogError("Catalog is empty — OpenRouter may be unreachable.");
      })
      .catch((err: unknown) => {
        if (!cancelled) setCatalogError(err instanceof Error ? err.message : "Failed to load OpenRouter catalog");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.modelId)), [selected]);

  const filtered = useMemo(() => {
    if (!catalog) return [];
    const q = query.trim().toLowerCase();
    if (!q) return catalog.slice(0, 200);
    return catalog
      .filter(
        (m) =>
          m.id.toLowerCase().includes(q) || m.label.toLowerCase().includes(q) || m.description.toLowerCase().includes(q),
      )
      .slice(0, 200);
  }, [catalog, query]);

  async function handleAdd(modelId: string) {
    setPendingId(modelId);
    try {
      await addOpenRouterModel({ data: { modelId } });
      const fresh = await listSelectedOpenRouterModels();
      setSelected(fresh);
      toast.success(`Added ${modelId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add model");
    } finally {
      setPendingId(null);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      const [result, fresh, freshCatalog] = await Promise.all([
        refreshOpenRouterPrices(),
        listSelectedOpenRouterModels(),
        listOpenRouterModels(),
      ]);
      setSelected(fresh);
      setCatalog(freshCatalog);
      const parts = [`Updated ${result.updated} of ${result.total}`];
      if (result.missing > 0) parts.push(`${result.missing} no longer in catalog`);
      toast.success(parts.join(" · "));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to refresh prices");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleRemove(modelId: string) {
    setPendingId(modelId);
    try {
      await removeOpenRouterModel({ data: { modelId } });
      setSelected((prev) => prev.filter((s) => s.modelId !== modelId));
      toast.success(`Removed ${modelId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove model");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-[var(--ink-faint)]">
          Prices are snapshotted when added — historical chat costs do not change. Refresh to pull current OpenRouter pricing
          for future runs.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isRefreshing || selected.length === 0}
          onClick={handleRefresh}
          className="h-7 shrink-0 gap-1.5 px-2"
        >
          <RefreshCwIcon className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing…" : "Refresh prices"}
        </Button>
      </div>
      {selected.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
            Selected ({selected.length})
          </div>
          <div className="flex flex-col gap-1.5 rounded-md border border-[var(--line)] bg-[var(--surface)] p-2">
            {selected.map((s) => (
              <div key={s.modelId} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-[var(--bg)]">
                <CheckIcon className="size-3.5 shrink-0 text-[var(--accent)]" />
                <span className="truncate text-sm font-medium text-[var(--ink)]">{s.label}</span>
                <span className="truncate font-mono text-[11px] text-[var(--ink-faint)]">{s.modelId}</span>
                {formatPrice(s.inputCostPerMillionTokensUsd, s.outputCostPerMillionTokensUsd) && (
                  <span className="ml-auto shrink-0 font-mono text-[10px] tabular-nums text-[var(--ink-faint)]">
                    {formatPrice(s.inputCostPerMillionTokensUsd, s.outputCostPerMillionTokensUsd)}
                  </span>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pendingId === s.modelId}
                  onClick={() => handleRemove(s.modelId)}
                  className="h-7 px-2 text-[var(--destructive)] hover:bg-[var(--destructive-subtle)]"
                  aria-label={`Remove ${s.label}`}
                >
                  <TrashIcon className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">Catalog</div>
          {catalog && <span className="font-mono text-[10px] text-[var(--ink-faint)]">{catalog.length} models</span>}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search OpenRouter catalog…"
          className="w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]"
        />
        {catalogError && (
          <div className="rounded-md border border-[var(--warning)]/30 bg-[var(--warning-subtle)] px-3 py-2 text-xs text-[var(--warning)]">
            {catalogError}
          </div>
        )}
        <div
          className="flex max-h-96 flex-col gap-1 overflow-y-auto rounded-md border border-[var(--line)] bg-[var(--surface)] p-2"
          style={{ scrollbarGutter: "stable" }}
        >
          {!catalog && <div className="px-3 py-6 text-center text-sm text-[var(--ink-faint)]">Loading catalog…</div>}
          {catalog && filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-[var(--ink-faint)]">No models match.</div>
          )}
          {filtered.map((m) => {
            const isSelected = selectedIds.has(m.id);
            const price = formatPrice(m.inputCostPerMillionTokensUsd, m.outputCostPerMillionTokensUsd);
            return (
              <div
                key={m.id}
                className={`flex items-center gap-2 rounded px-2 py-1.5 hover:bg-[var(--bg)] ${
                  isSelected ? "opacity-60" : ""
                }`}
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium text-[var(--ink)]">{m.label}</span>
                    {isSelected && (
                      <Badge variant="outline" className="text-[9px] uppercase tracking-[0.08em]">
                        added
                      </Badge>
                    )}
                  </div>
                  <span className="truncate font-mono text-[11px] text-[var(--ink-faint)]">{m.id}</span>
                </div>
                {price && (
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--ink-faint)]">{price}</span>
                )}
                {isSelected ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pendingId === m.id}
                    onClick={() => handleRemove(m.id)}
                    className="h-7 px-2 text-[var(--destructive)] hover:bg-[var(--destructive-subtle)]"
                  >
                    Remove
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pendingId === m.id}
                    onClick={() => handleAdd(m.id)}
                    className="h-7 gap-1 px-2"
                  >
                    <PlusIcon className="size-3.5" />
                    Add
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        {catalog && filtered.length === 200 && (
          <div className="text-center text-[11px] text-[var(--ink-faint)]">
            Showing first 200 results — refine search to narrow.
          </div>
        )}
      </div>
    </div>
  );
}
