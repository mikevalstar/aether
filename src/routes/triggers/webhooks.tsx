import { createFileRoute, redirect } from "@tanstack/react-router";
import { Webhook } from "lucide-react";
import { PageHeader } from "#/components/PageHeader";
import { WebhookManager } from "#/components/triggers/WebhookManager";
import { getSession } from "#/lib/auth.functions";
import { getWebhooksPageData } from "#/lib/triggers/trigger.functions";

export const Route = createFileRoute("/triggers/webhooks")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  loader: async () => {
    return await getWebhooksPageData();
  },
  component: WebhooksPage,
});

function WebhooksPage() {
  const data = Route.useLoaderData();

  return (
    <PageHeader
      icon={Webhook}
      label="Triggers"
      title="Webhook"
      highlight="endpoints"
      description="Manage webhook API keys for receiving external events. Each webhook generates a unique URL that external services can POST JSON to."
    >
      <WebhookManager initialItems={data.items} />
    </PageHeader>
  );
}
