import { createFileRoute, redirect } from "@tanstack/react-router";
import { Puzzle } from "lucide-react";
import { PageHeader } from "#/components/PageHeader";
import { getSession } from "#/lib/auth.functions";
import { plugins } from "#/plugins";

export const Route = createFileRoute("/p/$pluginId/$pageId")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  component: PluginSubPage,
});

function PluginSubPage() {
  const { pluginId, pageId } = Route.useParams();

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
  const page = pages.find((p) => p.id === pageId);

  if (!page) {
    return (
      <PageHeader
        icon={plugin.meta.icon}
        label={plugin.meta.name}
        title="Page not found"
        description={`Plugin "${plugin.meta.name}" has no page with id "${pageId}".`}
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
