import cronstrue from "cronstrue";
import { RunHistoryTable } from "#/components/shared/RunHistoryTable";
import type { TaskRunItem } from "#/lib/tasks/task.functions";
import { convertTaskToChat, deleteTaskRun } from "#/lib/tasks/task.functions";

function MetaChip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warn" | "accent" }) {
  const cls =
    tone === "warn"
      ? "border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-300"
      : tone === "accent"
        ? "border-[var(--accent)]/30 bg-[var(--accent-subtle)] text-[var(--accent)]"
        : "border-[var(--line)] bg-[var(--bg)] text-[var(--ink-soft)]";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {children}
    </span>
  );
}

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
        <MetaChip tone="accent">{task.model}</MetaChip>
        {task.timezone && <MetaChip>{task.timezone}</MetaChip>}
        {!task.fileExists && <MetaChip tone="warn">File removed</MetaChip>}
        {!task.enabled && task.fileExists && <MetaChip>Paused</MetaChip>}
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
