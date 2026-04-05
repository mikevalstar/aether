import { createFileRoute, redirect } from "@tanstack/react-router";
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
      <main className="page-wrap px-4 pb-12 pt-10">
        <h1 className="text-2xl font-bold">Plugin not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">No plugin with id "{pluginId}" is registered.</p>
      </main>
    );
  }

  const pages = plugin.client?.pages ?? [];
  const page = pages.find((p) => p.id === pageId);

  if (!page) {
    return (
      <main className="page-wrap px-4 pb-12 pt-10">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Plugin "{plugin.meta.name}" has no page with id "{pageId}".
        </p>
      </main>
    );
  }

  const PageComponent = page.component;
  return <PageComponent />;
}
