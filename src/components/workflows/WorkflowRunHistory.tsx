import { RunHistoryTable } from "#/components/shared/RunHistoryTable";
import type { WorkflowRunItem } from "#/lib/workflow.functions";
import { convertWorkflowToChat, deleteWorkflowRun } from "#/lib/workflow.functions";

export function WorkflowRunHistory({ runs }: { runs: WorkflowRunItem[] }) {
  return (
    <RunHistoryTable
      runs={runs}
      onDelete={deleteWorkflowRun}
      onConvertToChat={convertWorkflowToChat}
      emptyLabel="workflow"
    />
  );
}
