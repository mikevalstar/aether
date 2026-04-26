import { FileX } from "lucide-react";
import { RunHistoryTable } from "#/components/shared/RunHistoryTable";
import { Badge } from "#/components/ui/badge";
import type { TriggerRunItem } from "#/lib/triggers/trigger.functions";
import { convertTriggerToChat, deleteTriggerRun } from "#/lib/triggers/trigger.functions";

export function TriggerRunHistory({
  trigger,
  runs,
  highlightId,
}: {
  trigger: {
    filename: string;
    title: string;
    type: string;
    pattern: string | null;
    model: string;
    effort: string;
    enabled: boolean;
    fileExists: boolean;
  };
  runs: TriggerRunItem[];
  highlightId?: string;
}) {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <code className="rounded border border-[var(--line)] bg-[var(--bg)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--ink-soft)]">
          {trigger.type}
        </code>
        {trigger.pattern && (
          <code className="max-w-[300px] truncate rounded border border-[var(--line)] bg-[var(--bg)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--ink-soft)]">
            {trigger.pattern}
          </code>
        )}
        <Badge variant="model-name">{trigger.model}</Badge>
        {!trigger.fileExists && (
          <Badge variant="warning">
            <FileX />
            File removed
          </Badge>
        )}
        {!trigger.enabled && trigger.fileExists && <Badge variant="ghost">Paused</Badge>}
      </div>

      <RunHistoryTable
        runs={runs}
        onDelete={deleteTriggerRun}
        onConvertToChat={convertTriggerToChat}
        emptyLabel="trigger"
        highlightId={highlightId}
      />
    </div>
  );
}
