import { useNavigate, useRouter } from "@tanstack/react-router";
import { CheckIcon, ChevronsUpDownIcon, FileTextIcon, FolderPlusIcon, Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "#/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { getObsidianHref } from "#/lib/obsidian/obsidian";
import {
  createObsidianFile,
  listObsidianFolders,
  listObsidianTemplates,
  type ObsidianTemplate,
} from "#/lib/obsidian/obsidian.functions";
import { cn } from "#/lib/utils";

type NewFileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const NO_TEMPLATE = "__none__";

export function NewFileDialog({ open, onOpenChange }: NewFileDialogProps) {
  const [filename, setFilename] = useState("");
  const [folder, setFolder] = useState("");
  const [folderSearch, setFolderSearch] = useState("");
  const [folderOpen, setFolderOpen] = useState(false);
  const [templateFilename, setTemplateFilename] = useState(NO_TEMPLATE);
  const [templates, setTemplates] = useState<ObsidianTemplate[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setFilename("");
    setFolder("");
    setFolderSearch("");
    setTemplateFilename(NO_TEMPLATE);
    setError(null);

    listObsidianTemplates().then(setTemplates);
    listObsidianFolders().then((f) => setFolders(f.filter((x) => x !== "")));
  }, [open]);

  const showCreateOption =
    folderSearch.trim() !== "" && !folders.some((f) => f.toLowerCase() === folderSearch.trim().toLowerCase());

  async function handleCreate() {
    const trimmed = filename.trim();
    if (!trimmed) {
      setError("Filename is required");
      return;
    }

    setError(null);
    setCreating(true);

    try {
      const result = await createObsidianFile({
        data: {
          folder,
          filename: trimmed,
          templateFilename: templateFilename === NO_TEMPLATE ? undefined : templateFilename,
        },
      });
      onOpenChange(false);
      router.invalidate();
      navigate({
        to: getObsidianHref(result.routePath),
        search: { edit: true },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create file");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileTextIcon className="size-4 text-[var(--accent)]" />
            New File
          </DialogTitle>
          <DialogDescription>Create a new Markdown file in your vault.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="new-file-name">Filename</Label>
            <Input
              id="new-file-name"
              placeholder="my-new-note"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">.md extension added automatically if omitted.</p>
          </div>

          <div className="space-y-2">
            <Label>Folder</Label>
            <Popover open={folderOpen} onOpenChange={setFolderOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={folderOpen}
                  className="w-full justify-between font-normal"
                >
                  {folder || "/ (vault root)"}
                  <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput
                    placeholder="Search or type new folder..."
                    value={folderSearch}
                    onValueChange={setFolderSearch}
                  />
                  <CommandList>
                    <CommandEmpty>{folderSearch.trim() ? "No matching folders." : "No folders in vault."}</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="/ (vault root)"
                        onSelect={() => {
                          setFolder("");
                          setFolderSearch("");
                          setFolderOpen(false);
                        }}
                      >
                        <CheckIcon className={cn("mr-2 size-4", folder === "" ? "opacity-100" : "opacity-0")} />/ (vault
                        root)
                      </CommandItem>
                      {folders.map((f) => (
                        <CommandItem
                          key={f}
                          value={f}
                          onSelect={() => {
                            setFolder(f);
                            setFolderSearch("");
                            setFolderOpen(false);
                          }}
                        >
                          <CheckIcon className={cn("mr-2 size-4", folder === f ? "opacity-100" : "opacity-0")} />
                          {f}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    {showCreateOption && (
                      <CommandGroup heading="Create new">
                        <CommandItem
                          value={`create:${folderSearch.trim()}`}
                          onSelect={() => {
                            setFolder(folderSearch.trim());
                            setFolderSearch("");
                            setFolderOpen(false);
                          }}
                        >
                          <FolderPlusIcon className="mr-2 size-4" />
                          {folderSearch.trim()}
                        </CommandItem>
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">New folders will be created automatically.</p>
          </div>

          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={templateFilename} onValueChange={setTemplateFilename}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TEMPLATE}>Blank file</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.filename} value={t.filename}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating && <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
