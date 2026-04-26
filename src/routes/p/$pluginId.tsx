import { createFileRoute, redirect } from "@tanstack/react-router";
import { Puzzle } from "lucide-react";
import { PageHeader } from "#/components/PageHeader";
import { getSession } from "#/lib/auth.functions";
import { plugins } from "#/plugins";

export const Route = createFileRoute("/p/$pluginId")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  component: PluginPage,
});

function PluginPage() {
  const { pluginId } = Route.useParams();

  const plugin = plugins.find((p) => p.meta.id === pluginId);
  if (!plugin) {
    return (
      <PageHeader
        icon={Puzzle}
        label="Plugin"
        title="Plugin not found"
        description={`No plugin with id "${pluginId}" is registered.`}
      />
    );
  }

  const pages = plugin.client?.pages ?? [];
  const page = pages[0];

  if (!page) {
    return (
      <PageHeader
        icon={plugin.meta.icon}
        label={plugin.meta.name}
        title={plugin.meta.name}
        description="This plugin has no pages."
      />
    );
  }

  const PageComponent = page.component;
  return (
    <PageHeader icon={page.icon ?? plugin.meta.icon} label={plugin.meta.name} title={page.label}>
      <PageComponent />
    </PageHeader>
  );
}
