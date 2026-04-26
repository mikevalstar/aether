import { Check, ChevronsUpDown, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "#/components/ui/command";
import { FieldRow } from "#/components/ui/field-row";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { toast } from "#/components/ui/sonner";
import { getBoardData } from "#/lib/board/board.functions";
import type { KanbanColumn } from "#/lib/board/kanban-parser";
import { searchVaultFiles, updateUserPreferences } from "#/lib/preferences.functions";
import type { PluginClientContext } from "../types";

export function BoardSettingsComponent({
  ctx,
  onSave,
}: {
  ctx: PluginClientContext;
  onSave: (options: Record<string, unknown>) => Promise<void>;
}) {
  const [kanbanFile, setKanbanFile] = useState((ctx.options.kanbanFile as string) || "");
  const [dashboardColumn, setDashboardColumn] = useState((ctx.options.dashboardColumn as string) || "");
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ path: string; title: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load board columns when a kanban file is set
  useEffect(() => {
    if (!kanbanFile) {
      setColumns([]);
      return;
    }
    getBoardData({ data: { filePath: kanbanFile } })
      .then((result) => {
        if (result.configured) {
          setColumns(result.columns);
        } else {
          setColumns([]);
        }
      })
      .catch(() => setColumns([]));
  }, [kanbanFile]);

  const searchFiles = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      searchVaultFiles({ data: { query } })
        .then(setResults)
        .catch(() => setResults([]));
    }, 250);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: debounced search
  useEffect(() => {
    searchFiles(search);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
          // Save kanbanFile to user preferences (used by board.server.ts)
          await updateUserPreferences({
            data: {
              kanbanFile: kanbanFile || undefined,
            },
          });
          // Save dashboardColumn to plugin options
          await onSave({ kanbanFile, dashboardColumn: dashboardColumn || undefined });
          toast.success("Board settings saved");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to save board settings");
        } finally {
          setIsSaving(false);
        }
      }}
      className="flex flex-col gap-5"
    >
      <FieldRow label="KANBAN FILE">
        <div className="flex items-center gap-2">
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="min-w-0 flex-1 justify-between bg-background font-mono text-[12.5px] font-normal"
              >
                {kanbanFile || "Select a kanban file..."}
                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput placeholder="Search vault files..." value={search} onValueChange={setSearch} />
                <CommandList>
                  <CommandEmpty>No files found.</CommandEmpty>
                  <CommandGroup>
                    {results.map((f) => (
                      <CommandItem
                        key={f.path}
                        value={f.path}
                        onSelect={() => {
                          setKanbanFile(f.path);
                          setPickerOpen(false);
                          setSearch("");
                        }}
                      >
                        <Check className={`mr-2 size-4 ${kanbanFile === f.path ? "opacity-100" : "opacity-0"}`} />
                        <span className="truncate">{f.title}</span>
                        <span className="ml-auto text-xs text-muted-foreground truncate">{f.path}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {kanbanFile && (
            <Button type="button" variant="ghost" size="icon" onClick={() => setKanbanFile("")}>
              <X className="size-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Choose an Obsidian Kanban plugin file to power the Board page.</p>
      </FieldRow>

      {kanbanFile && columns.length > 0 && (
        <FieldRow label="DASHBOARD COLUMN" hint={<span>optional</span>}>
          <div className="flex items-center gap-2">
            <Select value={dashboardColumn} onValueChange={setDashboardColumn}>
              <SelectTrigger className="flex-1 font-mono text-[12.5px]">
                <SelectValue placeholder="Select a column to show on dashboard..." />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col.name} value={col.name}>
                    {col.name} ({col.tasks.length} tasks)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {dashboardColumn && (
              <Button type="button" variant="ghost" size="icon" onClick={() => setDashboardColumn("")}>
                <X className="size-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Show this column as a read-only widget on the dashboard.</p>
        </FieldRow>
      )}

      <Button type="submit" disabled={isSaving} className="mt-1 w-fit">
        {isSaving ? "Saving..." : "Save board settings"}
      </Button>
    </form>
  );
}
