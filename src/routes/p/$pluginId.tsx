import { createFileRoute, redirect } from "@tanstack/react-router";
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
      <main className="page-wrap px-4 pb-12 pt-10">
        <h1 className="text-2xl font-bold">Plugin not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">No plugin with id "{pluginId}" is registered.</p>
      </main>
    );
  }

  // Find the default page (first page in the plugin's pages array)
  const pages = plugin.client?.pages ?? [];
  const page = pages[0];

  if (!page) {
    return (
      <main className="page-wrap px-4 pb-12 pt-10">
        <h1 className="text-2xl font-bold">{plugin.meta.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">This plugin has no pages.</p>
      </main>
    );
  }

  const PageComponent = page.component;
  return <PageComponent />;
}
