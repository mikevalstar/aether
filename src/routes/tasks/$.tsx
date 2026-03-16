import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { TaskRunHistory } from "#/components/tasks/TaskRunHistory";
import { GlowBg } from "#/components/ui/glow-bg";
import { SectionLabel } from "#/components/ui/section-label";
import { getSession } from "#/lib/auth.functions";
import { getTaskRunHistory } from "#/lib/task.functions";

export const Route = createFileRoute("/tasks/$")({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session) {
			throw redirect({ to: "/login" });
		}
	},
	loader: async ({ params }) => {
		return await getTaskRunHistory({
			data: { filename: params._splat ?? "" },
		});
	},
	component: TaskRunHistoryPage,
});

function TaskRunHistoryPage() {
	const data = Route.useLoaderData();

	return (
		<main className="relative overflow-hidden">
			<GlowBg color="var(--teal)" size="size-[500px]" position="-right-48 -top-48" />

			<div className="page-wrap relative px-4 pb-16 pt-10 sm:pt-12">
				<Link
					to="/tasks"
					className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
				>
					<ArrowLeft className="size-4" />
					Back to tasks
				</Link>

				<section className="mb-8">
					<SectionLabel icon={CalendarClock} color="text-[var(--teal)]">
						Task History
					</SectionLabel>
					<h1 className="display-title mt-4 mb-2 text-3xl font-bold tracking-tight sm:text-4xl">{data.task.title}</h1>
				</section>

				<TaskRunHistory task={data.task} runs={data.runs} />
			</div>
		</main>
	);
}
