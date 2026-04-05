import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { toast } from "#/components/ui/sonner";
import { createConfigFile } from "#/lib/config-editor/config-editor.functions";

type NewTaskDialogProps = {
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

const DEFAULT_TASK_FRONTMATTER = {
  cron: "0 9 * * *",
  model: "claude-haiku-4-5",
  effort: "low",
  enabled: false,
  notification: "silent",
  notificationLevel: "info",
  notifyUsers: ["all"],
  pushMessage: false,
};

export function NewTaskDialog({ open, onOpenChange }: NewTaskDialogProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [filename, setFilename] = useState("");
  const [filenameManual, setFilenameManual] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-derive filename from title unless manually overridden
  useEffect(() => {
    if (!filenameManual && title) {
      setFilename(toKebabCase(title));
    }
  }, [title, filenameManual]);

  // Reset on open
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
          subfolder: "tasks",
          title: title.trim(),
          filename: filename.trim(),
          defaultFrontmatter: DEFAULT_TASK_FRONTMATTER,
        },
      });

      toast.success("Task created", { description: result.filename });
      onOpenChange(false);
      navigate({ to: "/tasks/editor/$", params: { _splat: result.filename }, search: { configure: true } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create task";
      setError(message);
      setCreating(false);
    }
  }

  const displayFilename = filename ? (filename.endsWith(".md") ? filename : `${filename}.md`) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
          <DialogDescription>
            Create a new scheduled AI task. You can configure the schedule and settings after creation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="task-title" className="text-xs">
              Task Name
            </Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Daily Summary"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !creating) handleCreate();
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-filename" className="text-xs">
              Filename
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="task-filename"
                value={filename}
                onChange={(e) => handleFilenameChange(e.target.value)}
                placeholder="auto-derived from title"
                className="font-mono text-sm"
              />
            </div>
            {displayFilename && <p className="font-mono text-[11px] text-[var(--ink-soft)]/60">tasks/{displayFilename}</p>}
          </div>

          {error && <p className="text-sm text-destructive-foreground">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || !title.trim()}>
            {creating && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
