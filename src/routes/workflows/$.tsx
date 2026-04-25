import { createFileRoute, redirect } from "@tanstack/react-router";
import { Workflow } from "lucide-react";
import { z } from "zod";
import { DetailPageShell } from "#/components/shared/DetailPageShell";
import { WorkflowForm } from "#/components/workflows/WorkflowForm";
import { WorkflowRunHistory } from "#/components/workflows/WorkflowRunHistory";
import { getSession } from "#/lib/auth.functions";
import { getWorkflowDetail } from "#/lib/workflows/workflow.functions";

const workflowSearchSchema = z.object({
  highlight: z.string().optional(),
});

export const Route = createFileRoute("/workflows/$")({
  validateSearch: workflowSearchSchema,
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  loader: async ({ params }) => {
    return await getWorkflowDetail({
      data: { filename: params._splat ?? "" },
    });
  },
  component: WorkflowDetailPage,
});

function WorkflowDetailPage() {
  const data = Route.useLoaderData();
  const { highlight } = Route.useSearch();

  return (
    <DetailPageShell
      icon={Workflow}
      label="Workflow"
      title={data.workflow.title}
      externalLink={
        data.workflow.obsidianRoutePath
          ? {
              kind: "internal",
              to: "/o/$",
              params: { _splat: data.workflow.obsidianRoutePath },
              title: "View in Obsidian",
            }
          : undefined
      }
    >
      <div className="space-y-8">
        <WorkflowForm
          filename={data.workflow.filename}
          title={data.workflow.title}
          description={data.workflow.description}
          model={data.workflow.model}
          fields={data.workflow.fields}
          fileExists={data.workflow.fileExists}
        />

        <div>
          <h2 className="mb-4 text-lg font-semibold text-[var(--ink)]">Run History</h2>
          <WorkflowRunHistory runs={data.runs} highlightId={highlight} />
        </div>
      </div>
    </DetailPageShell>
  );
}
