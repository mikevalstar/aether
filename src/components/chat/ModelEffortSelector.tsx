import { Badge } from "#/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { CHAT_EFFORT_LEVELS, CHAT_MODELS, type ChatEffort, type ChatModel, EFFORT_LABELS } from "#/lib/chat/chat";

export interface ModelEffortSelectorProps {
  model: ChatModel;
  effort: ChatEffort;
  disabled?: boolean;
  /** Show model description badges in the dropdown */
  showModelBadges?: boolean;
  /** Additional class for the model select trigger */
  modelClassName?: string;
  /** Additional class for the effort select trigger */
  effortClassName?: string;
  onModelChange?: (model: string) => void;
  onEffortChange?: (effort: string) => void;
}

export function ModelEffortSelector({
  model,
  effort,
  disabled = false,
  showModelBadges = true,
  modelClassName = "",
  effortClassName = "",
  onModelChange,
  onEffortChange,
}: ModelEffortSelectorProps) {
  const currentModelSupportsEffort = CHAT_MODELS.find((m) => m.id === model)?.supportsEffort ?? false;

  return (
    <>
      <Select value={model} onValueChange={(value) => onModelChange?.(value)} disabled={disabled}>
        <SelectTrigger
          className={`min-w-0 border-[var(--accent)]/30 bg-[var(--accent-subtle)] font-semibold text-[var(--accent)] hover:bg-[var(--accent-subtle)] ${modelClassName}`}
        >
          <SelectValue placeholder="Choose model" />
        </SelectTrigger>
        <SelectContent>
          {CHAT_MODELS.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {showModelBadges ? (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{m.label}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {m.description}
                  </Badge>
                </div>
              ) : (
                <span className="font-medium">{m.label}</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {currentModelSupportsEffort && (
        <Select value={effort} onValueChange={(value) => onEffortChange?.(value)} disabled={disabled}>
          <SelectTrigger
            className={`w-20 border-[var(--warning)]/30 bg-[var(--warning)]/8 font-semibold text-[var(--warning)] hover:bg-[var(--warning)]/12 ${effortClassName}`}
          >
            <SelectValue placeholder="Effort" />
          </SelectTrigger>
          <SelectContent>
            {CHAT_EFFORT_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {EFFORT_LABELS[level]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </>
  );
}
