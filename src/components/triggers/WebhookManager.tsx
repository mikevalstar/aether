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
import { Button } from "#/components/ui/button";
import { DataTable, type DataTableColumn } from "#/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { toast } from "#/components/ui/sonner";
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
        <Button variant="ghost" size="icon-sm" onClick={handleCopy}>
          {copied ? (
            <Check className="size-3.5 text-[var(--success)]" />
          ) : (
            <Copy className="size-3.5 text-[var(--ink-soft)]" />
          )}
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

  const columns: DataTableColumn<WebhookListItem>[] = [
    {
      key: "name",
      header: "Name",
      cell: (item) => <span className="font-medium text-[var(--ink)]">{item.name}</span>,
    },
    {
      key: "type",
      header: "Type",
      mono: true,
      cell: (item) => (
        <code className="rounded border border-[var(--line)] bg-[var(--bg)] px-1.5 py-0.5 text-[11px] text-[var(--ink-soft)]">
          {item.type}
        </code>
      ),
    },
    {
      key: "url",
      header: "Webhook URL",
      mono: true,
      cell: (item) => {
        const url = getWebhookUrl(item.apiKey);
        return (
          <div className="flex items-center gap-1">
            <code className="max-w-[300px] truncate rounded border border-[var(--line)] bg-[var(--bg)] px-1.5 py-0.5 text-[11px] text-[var(--ink-soft)]">
              {url}
            </code>
            <CopyButton text={url} />
          </div>
        );
      },
    },
    {
      key: "last",
      header: "Last Received",
      mono: true,
      cell: (item) =>
        item.lastReceivedAt ? (
          <span className="text-[12.5px] text-[var(--ink)]">{formatRelativeTime(item.lastReceivedAt)}</span>
        ) : (
          <span className="text-[var(--ink-faint)]">Never</span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (item) => {
        const isLoading = loading.has(item.id);
        return (
          <div className="flex items-center justify-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" disabled={isLoading} onClick={() => setConfirmRegen(item.id)}>
                  <RefreshCw className="size-3.5 text-[var(--ink-soft)]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Regenerate API key</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={isLoading}
                  onClick={() => setConfirmDelete(item.id)}
                  className="text-[var(--destructive)] hover:text-[var(--destructive)]"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete webhook</TooltipContent>
            </Tooltip>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        title="Webhooks"
        count={items.length}
        data={items}
        columns={columns}
        rowKey={(item) => item.id}
        headerRight={
          <Button onClick={() => setCreateOpen(true)} size="xs" variant="outline">
            <Plus className="size-3" />
            <span className="tracking-[0.12em]">CREATE</span>
          </Button>
        }
      />

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
