import { createFileRoute, redirect } from "@tanstack/react-router";
import { Workflow } from "lucide-react";
import { PageHeader } from "#/components/PageHeader";
import { WorkflowCard } from "#/components/workflows/WorkflowCard";
import { WorkflowEmptyState } from "#/components/workflows/WorkflowEmptyState";
import { getSession } from "#/lib/auth.functions";
import { getWorkflowsPageData } from "#/lib/workflow.functions";

export const Route = createFileRoute("/workflows/")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  loader: async () => {
    return await getWorkflowsPageData();
  },
  component: WorkflowsPage,
});

function WorkflowsPage() {
  const data = Route.useLoaderData();

  return (
    <PageHeader
      icon={Workflow}
      label="Workflows"
      highlight="Workflows"
      title=""
      description="Form-based AI workflows that run in the background. Define workflows as markdown files in your AI config."
    >
      {data.items.length === 0 ? (
        <WorkflowEmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((item) => (
            <WorkflowCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </PageHeader>
  );
}
