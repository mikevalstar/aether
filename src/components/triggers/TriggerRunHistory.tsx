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
      <div className="mb-6 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{trigger.type}</code>
          {trigger.pattern && (
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs max-w-[300px] truncate">{trigger.pattern}</code>
          )}
          <Badge variant="outline" className="text-xs">
            {trigger.model}
          </Badge>
          {!trigger.fileExists && (
            <Badge variant="outline" className="border-amber-300 text-amber-600">
              File removed
            </Badge>
          )}
          {!trigger.enabled && trigger.fileExists && <Badge variant="outline">Paused</Badge>}
        </div>
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
