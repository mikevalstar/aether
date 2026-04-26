import { Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, FileX, Loader2, Pencil, Play } from "lucide-react";
import { useState } from "react";
import { formatRelativeTime } from "#/components/activity/format-relative-time";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { toast } from "#/components/ui/sonner";
import type { WorkflowListItem } from "#/lib/workflows/workflow.functions";
import { runWorkflow } from "#/lib/workflows/workflow.functions";

function StatusPill({ status }: { status: string | null }) {
  if (!status) return null;
  if (status === "success") {
    return (
      <Badge variant="success">
        <CheckCircle2 />
        Success
      </Badge>
    );
  }
  if (status === "running") {
    return (
      <Badge variant="warning">
        <Loader2 className="animate-spin" />
        Running
      </Badge>
    );
  }
  return (
    <Badge variant="destructive">
      <AlertCircle />
      Error
    </Badge>
  );
}

export function WorkflowCard({ item }: { item: WorkflowListItem }) {
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const dimmed = !item.fileExists;
  const fieldsCount = item.fields.length;

  async function handleRun(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (fieldsCount > 0) {
      // Workflow has fields — navigate to detail to fill the form.
      void navigate({ to: "/workflows/$", params: { _splat: item.filename } });
      return;
    }
    setRunning(true);
    try {
      await runWorkflow({ data: { filename: item.filename, formValues: {} } });
      toast.success("Workflow started", { description: `${item.title} is running.` });
    } catch (err) {
      toast.error("Failed to start workflow", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <Link
      to="/workflows/$"
      params={{ _splat: item.filename }}
      className={`group relative flex h-full flex-col rounded-md border border-[var(--line)] bg-[var(--surface)] p-4 no-underline transition-colors hover:border-[var(--line-strong)] ${
        dimmed ? "opacity-60" : ""
      }`}
    >
      {/* Header row */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="text-md font-semibold leading-tight tracking-tight text-[var(--ink)]">{item.title}</h3>
        {item.lastRunStatus && (
          <div className="flex shrink-0 items-center gap-1.5">
            <StatusPill status={item.lastRunStatus} />
          </div>
        )}
      </div>

      {/* Description */}
      {item.description && (
        <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-[var(--ink-soft)]">{item.description}</p>
      )}

      {/* Tag row */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">
          {fieldsCount} field{fieldsCount !== 1 ? "s" : ""}
        </Badge>
        <Badge variant="model-name">{item.model}</Badge>
        {!item.fileExists && (
          <Badge variant="warning">
            <FileX />
            File removed
          </Badge>
        )}
      </div>

      {/* Divider + footer */}
      <div className="mt-auto border-t border-[var(--line-strong)] pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
            {item.lastRunAt ? `Last run ${formatRelativeTime(item.lastRunAt)}` : "Never run"}
          </span>
          <div className="flex items-center gap-1.5">
            {item.fileExists && (
              <>
                <Button variant="outline" size="xs" asChild onClick={(e) => e.stopPropagation()}>
                  <Link to="/workflows/editor/$" params={{ _splat: item.filename }} search={{ configure: false }}>
                    <Pencil />
                    Edit
                  </Link>
                </Button>
                <Button variant="default" size="xs" disabled={running} onClick={handleRun}>
                  {running ? <Loader2 className="animate-spin" /> : <Play />}
                  Run
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
