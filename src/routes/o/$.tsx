import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { ObsidianViewer } from "#/components/obsidian/ObsidianViewer";
import { getSession } from "#/lib/auth.functions";
import { getObsidianViewerData } from "#/lib/obsidian.functions";

const obsidianSearchSchema = z.object({
	edit: z.boolean().optional(),
});

export const Route = createFileRoute("/o/$")({
	validateSearch: obsidianSearchSchema,
	beforeLoad: async () => {
		const session = await getSession();

		if (!session) {
			throw redirect({ to: "/login" });
		}
	},
	loader: async ({ params }) => {
		return await getObsidianViewerData({ data: { path: params._splat } });
	},
	component: ObsidianDocumentPage,
});

function ObsidianDocumentPage() {
	const data = Route.useLoaderData();
	const { edit } = Route.useSearch();
	return <ObsidianViewer key={data.requestedPath} data={data} initialEdit={edit} />;
}
