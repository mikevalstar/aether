import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { toast } from "#/components/ui/sonner";
import { createConfigFile } from "#/lib/config-editor/config-editor.functions";

type NewTriggerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const DEFAULT_TRIGGER_FRONTMATTER = {
  type: "",
  model: "claude-haiku-4-5",
  effort: "low",
  enabled: false,
  notification: "silent",
  notificationLevel: "info",
  notifyUsers: ["all"],
  pushMessage: false,
};

export function NewTriggerDialog({ open, onOpenChange }: NewTriggerDialogProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [filename, setFilename] = useState("");
  const [filenameManual, setFilenameManual] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filenameManual && title) {
      setFilename(toKebabCase(title));
    }
  }, [title, filenameManual]);

  useEffect(() => {
    if (open) {
      setTitle("");
      setFilename("");
      setFilenameManual(false);
      setCreating(false);
      setError(null);
    }
  }, [open]);

  const handleFilenameChange = useCallback((value: string) => {
    setFilename(value);
    setFilenameManual(true);
  }, []);

  async function handleCreate() {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!filename.trim()) {
      setError("Filename is required");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const result = await createConfigFile({
        data: {
          subfolder: "triggers",
          title: title.trim(),
          filename: filename.trim(),
          defaultFrontmatter: DEFAULT_TRIGGER_FRONTMATTER,
        },
      });

      toast.success("Trigger created", { description: result.filename });
      onOpenChange(false);
      navigate({ to: "/triggers/editor/$", params: { _splat: result.filename }, search: { configure: true } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create trigger";
      setError(message);
      setCreating(false);
    }
  }

  const displayFilename = filename ? (filename.endsWith(".md") ? filename : `${filename}.md`) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Trigger</DialogTitle>
          <DialogDescription>
            Create a new event-driven AI trigger. You can configure the event type and settings after creation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="trigger-title" className="text-xs">
              Trigger Name
            </Label>
            <Input
              id="trigger-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. GitHub Push Summary"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !creating) handleCreate();
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trigger-filename" className="text-xs">
              Filename
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="trigger-filename"
                value={filename}
                onChange={(e) => handleFilenameChange(e.target.value)}
                placeholder="auto-derived from title"
                className="font-mono text-sm"
              />
            </div>
            {displayFilename && (
              <p className="font-mono text-[11px] text-[var(--ink-soft)]/60">triggers/{displayFilename}</p>
            )}
          </div>

          {error && <p className="text-sm text-destructive-foreground">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || !title.trim()}>
            {creating && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            Create Trigger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
