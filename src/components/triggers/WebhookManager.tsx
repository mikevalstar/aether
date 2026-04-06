import { AlertTriangle, Check, Copy, Loader2, Plus, RefreshCw, Trash2, Webhook } from "lucide-react";
import { useCallback, useState } from "react";
import { formatRelativeTime } from "#/components/activity/format-relative-time";
import { EmptyState } from "#/components/EmptyState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { toast } from "#/components/ui/sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { createWebhook, deleteWebhook, regenerateWebhookKey, type WebhookListItem } from "#/lib/triggers/trigger.functions";

function getWebhookUrl(apiKey: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/api/triggers/webhook/${apiKey}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2">
          {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied!" : "Copy URL"}</TooltipContent>
    </Tooltip>
  );
}

// ── Create Dialog ───────────────────────────────────────────────────

function CreateWebhookDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (item: WebhookListItem) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setType("");
    setCreating(false);
    setError(null);
  };

  async function handleCreate() {
    if (!name.trim() || !type.trim()) {
      setError("Name and type are required");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const result = await createWebhook({ data: { name: name.trim(), type: type.trim() } });
      const newItem: WebhookListItem = {
        id: result.id,
        name: result.name,
        type: result.type,
        apiKey: result.apiKey,
        lastReceivedAt: null,
        createdAt: new Date().toISOString(),
      };
      onCreated(newItem);
      toast.success("Webhook created", {
        description: `URL: ${getWebhookUrl(result.apiKey)}`,
      });
      onOpenChange(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create webhook");
      setCreating(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Webhook</DialogTitle>
          <DialogDescription>
            Generate a new webhook endpoint. External services can POST JSON to the generated URL.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="webhook-name" className="text-xs">
              Name
            </Label>
            <Input
              id="webhook-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. GitHub, Stripe"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !creating) handleCreate();
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="webhook-type" className="text-xs">
              Event Type
            </Label>
            <Input
              id="webhook-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g. github, stripe"
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-[var(--ink-soft)]">
              Triggers with this type will fire when this webhook receives a POST.
            </p>
          </div>

          {error && <p className="text-sm text-destructive-foreground">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || !name.trim() || !type.trim()}>
            {creating && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            Create Webhook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export function WebhookManager({ initialItems }: { initialItems: WebhookListItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmRegen, setConfirmRegen] = useState<string | null>(null);
  const [loading, setLoading] = useState<Set<string>>(new Set());

  const addLoading = (id: string) => setLoading((prev) => new Set(prev).add(id));
  const removeLoading = (id: string) =>
    setLoading((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  async function handleDelete(id: string) {
    addLoading(id);
    try {
      await deleteWebhook({ data: { id } });
      setItems((prev) => prev.filter((w) => w.id !== id));
      toast.success("Webhook deleted");
    } catch (err) {
      toast.error("Failed to delete webhook", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      removeLoading(id);
      setConfirmDelete(null);
    }
  }

  async function handleRegenerate(id: string) {
    addLoading(id);
    try {
      const result = await regenerateWebhookKey({ data: { id } });
      setItems((prev) => prev.map((w) => (w.id === id ? { ...w, apiKey: result.apiKey } : w)));
      toast.success("API key regenerated", {
        description: "The old URL will no longer work.",
      });
    } catch (err) {
      toast.error("Failed to regenerate key", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      removeLoading(id);
      setConfirmRegen(null);
    }
  }

  function handleCreated(item: WebhookListItem) {
    setItems((prev) => [item, ...prev]);
  }

  if (items.length === 0 && !createOpen) {
    return (
      <>
        <EmptyState
          icon={Webhook}
          title="No webhooks configured"
          description="Create a webhook to generate a URL that external services can POST events to. Events are matched to trigger configs by type."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              Create Webhook
            </Button>
          }
        />
        <CreateWebhookDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="mr-1.5 size-3.5" />
          Create Webhook
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Webhook URL</TableHead>
              <TableHead>Last Received</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const url = getWebhookUrl(item.apiKey);
              const isLoading = loading.has(item.id);

              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <code className="max-w-[300px] truncate rounded bg-muted px-1.5 py-0.5 text-[11px]">{url}</code>
                      <CopyButton text={url} />
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.lastReceivedAt ? (
                      formatRelativeTime(item.lastReceivedAt)
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isLoading}
                            onClick={() => setConfirmRegen(item.id)}
                            className="h-7 px-2"
                          >
                            <RefreshCw className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Regenerate API key</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isLoading}
                            onClick={() => setConfirmDelete(item.id)}
                            className="h-7 px-2 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete webhook</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <CreateWebhookDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />

      {/* Regenerate confirmation */}
      <AlertDialog open={!!confirmRegen} onOpenChange={(v) => !v && setConfirmRegen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              <AlertTriangle className="mr-1.5 inline size-4 text-amber-500" />
              The current webhook URL will stop working immediately. Any services using the old URL will need to be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmRegen && handleRegenerate(confirmRegen)}>Regenerate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the webhook and its URL. Any services using this URL will receive 401 errors.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
