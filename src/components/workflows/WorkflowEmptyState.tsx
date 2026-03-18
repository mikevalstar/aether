import { Workflow } from "lucide-react";

export function WorkflowEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
      <Workflow className="size-10 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold">No workflows configured</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Create markdown files in your AI config <code className="text-xs bg-muted px-1 py-0.5 rounded">workflows/</code>{" "}
        folder to define form-based AI workflows. Each file needs a{" "}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">title</code> and{" "}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">fields</code> in its frontmatter.
      </p>
    </div>
  );
}
