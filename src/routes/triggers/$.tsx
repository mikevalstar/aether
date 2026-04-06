import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Zap } from "lucide-react";
import { z } from "zod";
import { TriggerRunHistory } from "#/components/triggers/TriggerRunHistory";
import { GlowBg } from "#/components/ui/glow-bg";
import { SectionLabel } from "#/components/ui/section-label";
import { getSession } from "#/lib/auth.functions";
import { getTriggerRunHistory } from "#/lib/triggers/trigger.functions";

const triggerSearchSchema = z.object({
  highlight: z.string().optional(),
});

export const Route = createFileRoute("/triggers/$")({
  validateSearch: triggerSearchSchema,
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  loader: async ({ params }) => {
    return await getTriggerRunHistory({
      data: { filename: params._splat ?? "" },
    });
  },
  component: TriggerRunHistoryPage,
});

function TriggerRunHistoryPage() {
  const data = Route.useLoaderData();
  const { highlight } = Route.useSearch();

  return (
    <main className="relative overflow-hidden">
      <GlowBg color="var(--teal)" size="size-[500px]" position="-right-48 -top-48" />

      <div className="page-wrap relative px-4 pb-16 pt-10 sm:pt-12">
        <Link
          to="/triggers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="size-4" />
          Back to triggers
        </Link>

        <section className="mb-8">
          <SectionLabel icon={Zap} color="text-[var(--teal)]">
            Trigger History
          </SectionLabel>
          <h1 className="display-title mt-4 mb-2 text-3xl font-bold tracking-tight sm:text-4xl flex items-center gap-3">
            {data.trigger.title}
            <a
              href={`/o/${data.trigger.filename}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-[var(--teal)] transition-colors"
              title="Open in Obsidian"
            >
              <ExternalLink className="size-5" />
            </a>
          </h1>
        </section>

        <TriggerRunHistory trigger={data.trigger} runs={data.runs} highlightId={highlight} />
      </div>
    </main>
  );
}
