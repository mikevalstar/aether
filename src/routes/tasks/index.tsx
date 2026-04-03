import { createFileRoute, redirect } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { PageHeader } from "#/components/PageHeader";
import { TaskEmptyState } from "#/components/tasks/TaskEmptyState";
import { TaskTable } from "#/components/tasks/TaskTable";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { getSession } from "#/lib/auth.functions";
import { getTasksPageData } from "#/lib/tasks/task.functions";

export const Route = createFileRoute("/tasks/")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  loader: async () => {
    return await getTasksPageData();
  },
  component: TasksPage,
});

function TasksPage() {
  const data = Route.useLoaderData();

  return (
    <PageHeader
      icon={CalendarClock}
      label="Tasks"
      title="Periodic"
      highlight="tasks"
      description="Scheduled AI tasks that run automatically on a cron schedule."
    >
      {data.tasksDisabled && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="size-4" />
          <AlertDescription>
            {data.cronDisabled ? (
              <>
                The scheduler is globally disabled (<code className="text-xs">DISABLE_CRON=true</code>). Tasks and system
                jobs will not run automatically.
              </>
            ) : (
              <>
                File-based tasks are disabled (<code className="text-xs">DISABLE_TASKS=true</code>). System jobs (cleanup,
                calendar sync) are still running.
              </>
            )}{" "}
            You can still trigger tasks manually.
          </AlertDescription>
        </Alert>
      )}

      {data.items.length === 0 ? <TaskEmptyState /> : <TaskTable items={data.items} />}
    </PageHeader>
  );
}
