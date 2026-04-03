import { Workflow } from "lucide-react";
import { EmptyState } from "#/components/EmptyState";

export function WorkflowEmptyState() {
  return (
    <EmptyState
      icon={Workflow}
      title="No workflows configured"
      description={
        <>
          Create markdown files in your AI config <code className="rounded bg-muted px-1 py-0.5 text-xs">workflows/</code>{" "}
          folder to define form-based AI workflows. Each file needs a{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">title</code> and{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">fields</code> in its frontmatter.
        </>
      }
    />
  );
}
