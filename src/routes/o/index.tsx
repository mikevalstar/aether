import { createFileRoute, redirect } from "@tanstack/react-router";
import { ObsidianViewer } from "#/components/obsidian/ObsidianViewer";
import { getSession } from "#/lib/auth.functions";
import { getObsidianViewerData } from "#/lib/obsidian.functions";

export const Route = createFileRoute("/o/")({
	beforeLoad: async () => {
		const session = await getSession();

		if (!session) {
			throw redirect({ to: "/login" });
		}
	},
	loader: async () => {
		return await getObsidianViewerData({ data: { path: "" } });
	},
	component: ObsidianIndexPage,
});

function ObsidianIndexPage() {
	return <ObsidianViewer data={Route.useLoaderData()} />;
}
