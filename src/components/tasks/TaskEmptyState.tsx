import { CalendarClock } from "lucide-react";
import { EmptyState } from "#/components/EmptyState";

export function TaskEmptyState() {
  return (
    <EmptyState
      icon={CalendarClock}
      title="No tasks configured"
      description={
        <>
          Create markdown files in your AI config <code className="rounded bg-muted px-1 py-0.5 text-xs">tasks/</code> folder
          to define scheduled AI tasks. Each file needs a <code className="rounded bg-muted px-1 py-0.5 text-xs">cron</code>{" "}
          and <code className="rounded bg-muted px-1 py-0.5 text-xs">title</code> in its frontmatter.
        </>
      }
    />
  );
}
