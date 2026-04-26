import { createFileRoute, redirect } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { z } from "zod";
import { DetailPageShell } from "#/components/shared/DetailPageShell";
import { TaskRunHistory } from "#/components/tasks/TaskRunHistory";
import { getSession } from "#/lib/auth.functions";
import { getTaskRunHistory } from "#/lib/tasks/task.functions";

const taskSearchSchema = z.object({
  highlight: z.string().optional(),
});

export const Route = createFileRoute("/tasks/$")({
  validateSearch: taskSearchSchema,
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
  const { highlight } = Route.useSearch();

  return (
    <DetailPageShell
      icon={CalendarClock}
      label="Task History"
      title={data.task.title}
      externalLink={{ kind: "external", href: `/o/${data.task.filename}`, title: "Open in Obsidian" }}
    >
      <TaskRunHistory task={data.task} runs={data.runs} highlightId={highlight} />
    </DetailPageShell>
  );
}
