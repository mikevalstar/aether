import { createFileRoute, redirect } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { z } from "zod";
import { DetailPageShell } from "#/components/shared/DetailPageShell";
import { TriggerRunHistory } from "#/components/triggers/TriggerRunHistory";
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
    <DetailPageShell
      icon={Zap}
      label="Trigger History"
      title={data.trigger.title}
      backTo="/triggers"
      backLabel="Back to triggers"
      externalLink={{ kind: "external", href: `/o/${data.trigger.filename}`, title: "Open in Obsidian" }}
    >
      <TriggerRunHistory trigger={data.trigger} runs={data.runs} highlightId={highlight} />
    </DetailPageShell>
  );
}
