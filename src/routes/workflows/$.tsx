import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Workflow } from "lucide-react";
import { GlowBg } from "#/components/ui/glow-bg";
import { SectionLabel } from "#/components/ui/section-label";
import { WorkflowForm } from "#/components/workflows/WorkflowForm";
import { WorkflowRunHistory } from "#/components/workflows/WorkflowRunHistory";
import { getSession } from "#/lib/auth.functions";
import { getWorkflowDetail } from "#/lib/workflow.functions";

export const Route = createFileRoute("/workflows/$")({
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

  return (
    <main className="relative overflow-hidden">
      <GlowBg color="var(--teal)" size="size-[500px]" position="-right-48 -top-48" />

      <div className="page-wrap relative px-4 pb-16 pt-10 sm:pt-12">
        <Link
          to="/workflows"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="size-4" />
          Back to workflows
        </Link>

        <section className="mb-8">
          <SectionLabel icon={Workflow} color="text-[var(--teal)]">
            Workflow
          </SectionLabel>
          <h1 className="display-title mt-4 mb-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {data.workflow.title}
            {data.workflow.obsidianRoutePath && (
              <Link
                to="/o/$"
                params={{ _splat: data.workflow.obsidianRoutePath }}
                className="ml-2 inline-flex align-middle text-muted-foreground hover:text-[var(--teal)] transition-colors"
                title="View in Obsidian"
              >
                <ExternalLink className="size-5" />
              </Link>
            )}
          </h1>
        </section>

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
            <h2 className="text-lg font-semibold mb-4">Run History</h2>
            <WorkflowRunHistory runs={data.runs} />
          </div>
        </div>
      </div>
    </main>
  );
}
