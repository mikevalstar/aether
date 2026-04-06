import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Webhook, Zap } from "lucide-react";
import { PageHeader } from "#/components/PageHeader";
import { TriggerEmptyState } from "#/components/triggers/TriggerEmptyState";
import { TriggerTable } from "#/components/triggers/TriggerTable";
import { Button } from "#/components/ui/button";
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
      action={
        <Button variant="outline" size="sm" asChild>
          <Link to="/triggers/webhooks">
            <Webhook className="mr-1.5 size-3.5" />
            Webhooks
          </Link>
        </Button>
      }
    >
      {data.items.length === 0 ? <TriggerEmptyState /> : <TriggerTable items={data.items} />}
    </PageHeader>
  );
}
