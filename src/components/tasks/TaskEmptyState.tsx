import { CalendarClock } from "lucide-react";

export function TaskEmptyState() {
	return (
		<div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
			<CalendarClock className="size-10 text-muted-foreground mb-4" />
			<h3 className="text-lg font-semibold">No tasks configured</h3>
			<p className="mt-2 max-w-sm text-sm text-muted-foreground">
				Create markdown files in your AI config <code className="text-xs bg-muted px-1 py-0.5 rounded">tasks/</code> folder
				to define scheduled AI tasks. Each file needs a <code className="text-xs bg-muted px-1 py-0.5 rounded">cron</code>{" "}
				and <code className="text-xs bg-muted px-1 py-0.5 rounded">title</code> in its frontmatter.
			</p>
		</div>
	);
}
