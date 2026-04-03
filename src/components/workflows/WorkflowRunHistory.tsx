import { RunHistoryTable } from "#/components/shared/RunHistoryTable";
import type { WorkflowRunItem } from "#/lib/workflows/workflow.functions";
import { convertWorkflowToChat, deleteWorkflowRun } from "#/lib/workflows/workflow.functions";

export function WorkflowRunHistory({ runs, highlightId }: { runs: WorkflowRunItem[]; highlightId?: string }) {
  return (
    <RunHistoryTable
      runs={runs}
      onDelete={deleteWorkflowRun}
      onConvertToChat={convertWorkflowToChat}
      emptyLabel="workflow"
      highlightId={highlightId}
    />
  );
}
