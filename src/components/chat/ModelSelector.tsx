import { useEffect, useMemo, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { type ChatModelOption, listChatModels } from "#/lib/chat/chat-models.functions";

export interface ModelSelectorProps {
  /** Currently selected model id. May or may not exist in the loaded list. */
  model: string;
  /** Fallback label shown while the list loads or if `model` is no longer in the list. */
  modelLabel?: string;
  /** Fallback description badge for the same case. */
  modelDescription?: string;
  disabled?: boolean;
  /** Render the description badge inside the dropdown items. */
  showBadges?: boolean;
  className?: string;
  /** Skip the network fetch and use this list directly (for stories, tests, or callers that already have it). */
  models?: ChatModelOption[];
  onModelChange?: (model: string) => void;
  /** Called once with the resolved option (loaded list entry or seeded fallback) whenever the selection settles. */
  onResolvedOptionChange?: (option: ChatModelOption | undefined) => void;
}

function seedOption(model: string, label?: string, description?: string): ChatModelOption {
  return {
    id: model,
    label: label || model,
    description: description || "",
    supportsEffort: false,
    provider: "unknown",
  };
}

export function ModelSelector({
  model,
  modelLabel,
  modelDescription,
  disabled = false,
  showBadges = true,
  className = "",
  models: modelsOverride,
  onModelChange,
  onResolvedOptionChange,
}: ModelSelectorProps) {
  const [fetched, setFetched] = useState<ChatModelOption[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const models = modelsOverride ?? fetched;

  useEffect(() => {
    if (modelsOverride) return;
    let cancelled = false;
    listChatModels()
      .then((list) => {
        if (!cancelled) setFetched(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [modelsOverride]);

  // Build the items the dropdown will render. While loading: just the seeded current model.
  // After loading: the real list, with the current model appended as "(unavailable)" if missing.
  const items = useMemo<Array<ChatModelOption & { unavailable?: boolean }>>(() => {
    if (!models) {
      return [seedOption(model, modelLabel, modelDescription)];
    }
    const inList = models.some((m) => m.id === model);
    if (inList) return models;
    return [...models, { ...seedOption(model, modelLabel, modelDescription), unavailable: true }];
  }, [models, model, modelLabel, modelDescription]);

  // Notify parent of the resolved option so it can react (e.g., toggle effort selector).
  useEffect(() => {
    if (!onResolvedOptionChange) return;
    const resolved = items.find((m) => m.id === model);
    onResolvedOptionChange(resolved);
  }, [items, model, onResolvedOptionChange]);

  return (
    <Select value={model} onValueChange={(value) => onModelChange?.(value)} disabled={disabled}>
      <SelectTrigger
        className={`min-w-0 border-[var(--accent)]/30 bg-[var(--accent-subtle)] font-semibold text-[var(--accent)] hover:bg-[var(--accent-subtle)] ${className}`}
        title={error ? "Failed to load models — showing last known selection" : undefined}
      >
        <SelectValue placeholder={modelLabel || "Choose model"} />
      </SelectTrigger>
      <SelectContent>
        {items.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {showBadges ? (
              <div className="flex items-center gap-2">
                <span className="font-medium">{m.label}</span>
                {m.description && (
                  <Badge variant="secondary" className="text-[10px]">
                    {m.description}
                  </Badge>
                )}
                {m.unavailable && (
                  <Badge variant="outline" className="text-[10px] text-[var(--ink-faint)]">
                    unavailable
                  </Badge>
                )}
              </div>
            ) : (
              <span className="font-medium">
                {m.label}
                {m.unavailable ? " (unavailable)" : ""}
              </span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
