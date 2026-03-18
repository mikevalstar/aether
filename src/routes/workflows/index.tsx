import { createFileRoute, redirect } from "@tanstack/react-router";
import { Workflow } from "lucide-react";
import { GlowBg } from "#/components/ui/glow-bg";
import { SectionLabel } from "#/components/ui/section-label";
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
    <main className="relative overflow-hidden">
      <GlowBg color="var(--teal)" size="size-[500px]" position="-right-48 -top-48" />

      <div className="page-wrap relative px-4 pb-16 pt-10 sm:pt-12">
        <section className="mb-8">
          <SectionLabel icon={Workflow} color="text-[var(--teal)]">
            Workflows
          </SectionLabel>
          <h1 className="display-title mt-4 mb-2 text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="text-[var(--teal)]">Workflows</span>
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Form-based AI workflows that run in the background. Define workflows as markdown files in your AI config.
          </p>
        </section>

        {data.items.length === 0 ? (
          <WorkflowEmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((item) => (
              <WorkflowCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
