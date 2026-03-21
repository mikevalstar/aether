import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "#/components/ui/command";
import { Label } from "#/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { toast } from "#/components/ui/sonner";
import { searchVaultFiles, updateUserPreferences } from "#/lib/preferences.functions";

const settingsRoute = getRouteApi("/settings");

export const Route = createFileRoute("/settings/board")({
  component: BoardSection,
});

function BoardSection() {
  const data = settingsRoute.useLoaderData();

  const [kanbanFile, setKanbanFile] = useState(data.preferences.kanbanFile || "");
  const [isSaving, setIsSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ path: string; title: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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

  if (data.obsidianFolders.length === 0) {
    return (
      <div className="surface-card p-6">
        <h2 className="mb-2 text-lg font-semibold">Board</h2>
        <p className="text-sm text-muted-foreground">
          No Obsidian vault is configured. Set the vault path to enable board settings.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
          await updateUserPreferences({ data: { kanbanFile: kanbanFile || undefined } });
          toast.success("Board file saved");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to save board setting");
        } finally {
          setIsSaving(false);
        }
      }}
      className="surface-card p-6"
    >
      <h2 className="mb-4 text-lg font-semibold">Board</h2>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Kanban file</Label>
          <div className="flex gap-2">
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal">
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
        </div>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save board setting"}
        </Button>
      </div>
    </form>
  );
}
