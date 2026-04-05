import { AlertTriangle, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useCallback } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Switch } from "#/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";

export type FieldDefinition = {
  name: string;
  label: string;
  type: "text" | "textarea" | "url" | "select";
  required: boolean;
  placeholder: string;
  options: string[];
  default: string;
};

type FieldsArrayEditorProps = {
  fields: FieldDefinition[];
  onChange: (fields: FieldDefinition[]) => void;
  /** Placeholders found in the prompt body (for bidirectional validation) */
  bodyPlaceholders?: string[];
};

const EMPTY_FIELD: FieldDefinition = {
  name: "",
  label: "",
  type: "text",
  required: true,
  placeholder: "",
  options: [],
  default: "",
};

const FIELD_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Textarea" },
  { value: "url", label: "URL" },
  { value: "select", label: "Select" },
] as const;

// ─── Validation helpers ─────────────────────────────────────────────────

function getFieldWarnings(
  field: FieldDefinition,
  index: number,
  allFields: FieldDefinition[],
  bodyPlaceholders: string[],
): string[] {
  const warnings: string[] = [];

  if (!field.name.trim()) {
    warnings.push("Name is required");
  } else if (!/^[a-zA-Z_]\w*$/.test(field.name)) {
    warnings.push("Name must be a valid identifier (letters, numbers, underscores)");
  } else {
    const duplicate = allFields.findIndex((f, i) => i !== index && f.name === field.name);
    if (duplicate !== -1) warnings.push("Duplicate field name");
  }

  if (!field.label.trim()) {
    warnings.push("Label is required");
  }

  if (field.type === "select" && field.options.length === 0) {
    warnings.push("Select fields need at least one option");
  }

  if (field.name && bodyPlaceholders.length > 0 && !bodyPlaceholders.includes(field.name)) {
    warnings.push(`No {{${field.name}}} placeholder found in prompt body`);
  }

  return warnings;
}

function getOrphanedPlaceholders(fields: FieldDefinition[], bodyPlaceholders: string[]): string[] {
  const fieldNames = new Set(fields.map((f) => f.name).filter(Boolean));
  return bodyPlaceholders.filter((p) => !fieldNames.has(p));
}

// ─── Single Field Row ───────────────────────────────────────────────────

function FieldRow({
  field,
  index,
  total,
  warnings,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  field: FieldDefinition;
  index: number;
  total: number;
  warnings: string[];
  onUpdate: (index: number, field: FieldDefinition) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const hasWarnings = warnings.length > 0;

  function update<K extends keyof FieldDefinition>(key: K, value: FieldDefinition[K]) {
    onUpdate(index, { ...field, [key]: value });
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-3",
        hasWarnings ? "border-amber-400/50 bg-amber-50/5" : "border-[var(--line)]",
      )}
    >
      {/* Header row: name, type badge, move/delete controls */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-6" disabled={index === 0} onClick={() => onMoveUp(index)}>
            <ChevronUp className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={index === total - 1}
            onClick={() => onMoveDown(index)}
          >
            <ChevronDown className="size-3.5" />
          </Button>
        </div>

        <span className="text-[11px] font-mono text-[var(--ink-soft)]/50 min-w-[20px]">{index + 1}</span>

        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-[var(--ink)] truncate">{field.label || field.name || "New field"}</span>
          {field.name && <code className="ml-2 text-[10px] text-[var(--ink-soft)]/60 font-mono">{`{{${field.name}}}`}</code>}
        </div>

        {hasWarnings && (
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[250px]">
              <ul className="text-xs space-y-0.5">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-destructive-foreground hover:bg-destructive/10"
          onClick={() => onRemove(index)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {/* Field details */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] text-[var(--ink-soft)]">Name (identifier)</Label>
          <Input
            value={field.name}
            onChange={(e) => update("name", e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
            placeholder="fieldName"
            className="h-7 text-xs font-mono"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-[var(--ink-soft)]">Label</Label>
          <Input
            value={field.label}
            onChange={(e) => update("label", e.target.value)}
            placeholder="Display label"
            className="h-7 text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] text-[var(--ink-soft)]">Type</Label>
          <Select value={field.type} onValueChange={(v) => update("type", v as FieldDefinition["type"])}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end justify-between pb-1">
          <div className="space-y-1">
            <Label className="text-[10px] text-[var(--ink-soft)]">Required</Label>
            <div>
              <Switch
                checked={field.required}
                onCheckedChange={(v) => update("required", v)}
                className="scale-75 origin-left"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] text-[var(--ink-soft)]">Placeholder (optional)</Label>
        <Input
          value={field.placeholder}
          onChange={(e) => update("placeholder", e.target.value)}
          placeholder="Hint text shown in the empty input"
          className="h-7 text-xs"
        />
      </div>

      {field.type === "select" && (
        <div className="space-y-1">
          <Label className="text-[10px] text-[var(--ink-soft)]">Options (comma-separated)</Label>
          <Input
            value={field.options.join(", ")}
            onChange={(e) =>
              update(
                "options",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
            placeholder="option1, option2, option3"
            className="h-7 text-xs"
          />
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-[10px] text-[var(--ink-soft)]">Default value (optional)</Label>
        <Input
          value={field.default}
          onChange={(e) => update("default", e.target.value)}
          placeholder="Pre-filled value"
          className="h-7 text-xs"
        />
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

export function FieldsArrayEditor({ fields, onChange, bodyPlaceholders = [] }: FieldsArrayEditorProps) {
  const handleUpdate = useCallback(
    (index: number, field: FieldDefinition) => {
      const next = [...fields];
      next[index] = field;
      onChange(next);
    },
    [fields, onChange],
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      const next = [...fields];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      onChange(next);
    },
    [fields, onChange],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= fields.length - 1) return;
      const next = [...fields];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      onChange(next);
    },
    [fields, onChange],
  );

  const handleRemove = useCallback(
    (index: number) => {
      onChange(fields.filter((_, i) => i !== index));
    },
    [fields, onChange],
  );

  const handleAdd = useCallback(() => {
    onChange([...fields, { ...EMPTY_FIELD }]);
  }, [fields, onChange]);

  const orphanedPlaceholders = getOrphanedPlaceholders(fields, bodyPlaceholders);

  return (
    <div className="space-y-3">
      {/* Orphaned placeholders warning */}
      {orphanedPlaceholders.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-400/50 bg-amber-50/10 px-3 py-2">
          <AlertTriangle className="size-3.5 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-700 dark:text-amber-400">
            <p className="font-medium">Placeholders in prompt body without matching fields:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {orphanedPlaceholders.map((p) => (
                <Badge key={p} variant="outline" className="text-[10px] font-mono border-amber-400/50">
                  {`{{${p}}}`}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Field rows */}
      {fields.map((field, index) => (
        <FieldRow
          key={field.name || `new-field-${String(index)}`}
          field={field}
          index={index}
          total={fields.length}
          warnings={getFieldWarnings(field, index, fields, bodyPlaceholders)}
          onUpdate={handleUpdate}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onRemove={handleRemove}
        />
      ))}

      {/* Add field button */}
      <Button variant="outline" size="sm" className="w-full" onClick={handleAdd}>
        <Plus className="mr-1.5 size-3.5" />
        Add Field
      </Button>

      {fields.length === 0 && (
        <p className="text-center text-xs text-[var(--ink-soft)]">
          No fields yet. Add at least one field to define the workflow form.
        </p>
      )}
    </div>
  );
}
