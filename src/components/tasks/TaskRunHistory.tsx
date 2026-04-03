import cronstrue from "cronstrue";
import { RunHistoryTable } from "#/components/shared/RunHistoryTable";
import { Badge } from "#/components/ui/badge";
import type { TaskRunItem } from "#/lib/tasks/task.functions";
import { convertTaskToChat, deleteTaskRun } from "#/lib/tasks/task.functions";

export function TaskRunHistory({
  task,
  runs,
  highlightId,
}: {
  task: {
    filename: string;
    title: string;
    cron: string;
    model: string;
    effort: string;
    enabled: boolean;
    timezone: string | null;
    fileExists: boolean;
  };
  runs: TaskRunItem[];
  highlightId?: string;
}) {
  let cronHuman: string;
  try {
    cronHuman = cronstrue.toString(task.cron);
  } catch {
    cronHuman = task.cron;
  }

  return (
    <div>
      <div className="mb-6 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{cronHuman}</span>
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{task.cron}</code>
          <Badge variant="outline" className="text-xs">
            {task.model}
          </Badge>
          {task.timezone && (
            <Badge variant="outline" className="text-xs">
              {task.timezone}
            </Badge>
          )}
          {!task.fileExists && (
            <Badge variant="outline" className="border-amber-300 text-amber-600">
              File removed
            </Badge>
          )}
          {!task.enabled && task.fileExists && <Badge variant="outline">Paused</Badge>}
        </div>
      </div>

      <RunHistoryTable
        runs={runs}
        onDelete={deleteTaskRun}
        onConvertToChat={convertTaskToChat}
        emptyLabel="task"
        highlightId={highlightId}
      />
    </div>
  );
}
