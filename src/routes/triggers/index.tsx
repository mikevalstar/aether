import { createFileRoute, redirect } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { PageHeader } from "#/components/PageHeader";
import { TriggerEmptyState } from "#/components/triggers/TriggerEmptyState";
import { TriggerTable } from "#/components/triggers/TriggerTable";
import { getSession } from "#/lib/auth.functions";
import { getTriggersPageData } from "#/lib/triggers/trigger.functions";

export const Route = createFileRoute("/triggers/")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  loader: async () => {
    return await getTriggersPageData();
  },
  component: TriggersPage,
});

function TriggersPage() {
  const data = Route.useLoaderData();

  return (
    <PageHeader
      icon={Zap}
      label="Triggers"
      title="Event"
      highlight="triggers"
      description="Event-driven AI triggers that run in response to webhooks and plugin events."
    >
      {data.items.length === 0 ? <TriggerEmptyState /> : <TriggerTable items={data.items} />}
    </PageHeader>
  );
}
