import { createFileRoute, redirect } from "@tanstack/react-router";
import { RequirementsViewer } from "#/components/requirements/RequirementsViewer";
import { getSession } from "#/lib/auth.functions";
import { getRequirementsViewerData } from "#/lib/requirements.functions";

export const Route = createFileRoute("/requirements/")({
	beforeLoad: async () => {
		const session = await getSession();

		if (!session) {
			throw redirect({ to: "/login" });
		}
	},
	loader: async () => {
		return await getRequirementsViewerData({ data: { path: "" } });
	},
	component: RequirementsIndexPage,
});

function RequirementsIndexPage() {
	return <RequirementsViewer data={Route.useLoaderData()} />;
}
