import cronstrue from "cronstrue";
import { FileX } from "lucide-react";
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
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm text-[var(--ink-soft)]">{cronHuman}</span>
        <code className="rounded border border-[var(--line)] bg-[var(--bg)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--ink-soft)]">
          {task.cron}
        </code>
        <Badge variant="model-name">{task.model}</Badge>
        {task.timezone && <Badge variant="outline">{task.timezone}</Badge>}
        {!task.fileExists && (
          <Badge variant="warning">
            <FileX />
            File removed
          </Badge>
        )}
        {!task.enabled && task.fileExists && <Badge variant="ghost">Paused</Badge>}
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
