import { Zap } from "lucide-react";
import { EmptyState } from "#/components/EmptyState";

export function TriggerEmptyState() {
  return (
    <EmptyState
      icon={Zap}
      title="No triggers configured"
      description={
        <>
          Create markdown files in your AI config <code className="rounded bg-muted px-1 py-0.5 text-xs">triggers/</code>{" "}
          folder to define event-driven AI triggers. Each file needs a{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">type</code> and{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">title</code> in its frontmatter.
        </>
      }
    />
  );
}
