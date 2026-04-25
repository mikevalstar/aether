import { Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, FileX, FormInput, Pencil } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import type { WorkflowListItem } from "#/lib/workflows/workflow.functions";

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  if (status === "success")
    return (
      <Badge variant="outline" className="text-emerald-600 border-emerald-300">
        <CheckCircle2 className="mr-1 size-3" />
        Success
      </Badge>
    );
  if (status === "running")
    return (
      <Badge variant="outline" className="text-blue-600 border-blue-300">
        Running
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-red-600 border-red-300">
      <AlertCircle className="mr-1 size-3" />
      Error
    </Badge>
  );
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diff = date.getTime() - now;
  const absDiff = Math.abs(diff);

  if (absDiff < 60_000) return "just now";
  if (absDiff < 3_600_000) {
    const mins = Math.round(absDiff / 60_000);
    return `${mins}m ago`;
  }
  if (absDiff < 86_400_000) {
    const hours = Math.round(absDiff / 3_600_000);
    return `${hours}h ago`;
  }
  const days = Math.round(absDiff / 86_400_000);
  return `${days}d ago`;
}

export function WorkflowCard({ item }: { item: WorkflowListItem }) {
  const dimmed = !item.fileExists;

  return (
    <Link to="/workflows/$" params={{ _splat: item.filename }} className="no-underline">
      <Card className={`flex h-full flex-col transition-colors hover:bg-muted/50 ${dimmed ? "opacity-50" : ""}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">{item.title}</CardTitle>
            <div className="flex items-center gap-1.5">
              <Link
                to="/workflows/editor/$"
                params={{ _splat: item.filename }}
                search={{ configure: false }}
                className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
                title="Edit workflow"
              >
                <Pencil className="size-3.5" />
              </Link>
              <StatusBadge status={item.lastRunStatus} />
            </div>
          </div>
          {item.description && <CardDescription className="line-clamp-3 text-xs">{item.description}</CardDescription>}
        </CardHeader>
        <CardContent className="mt-auto">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FormInput className="size-3" />
              {item.fields.length} field{item.fields.length !== 1 ? "s" : ""}
            </span>
            <Badge variant="model-name">{item.model}</Badge>
            {item.lastRunAt && <span>Last run {formatRelativeTime(item.lastRunAt)}</span>}
            {!item.fileExists && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                <FileX className="mr-1 size-3" />
                File removed
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
