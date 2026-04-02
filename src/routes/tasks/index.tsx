import { createFileRoute, redirect } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { TaskEmptyState } from "#/components/tasks/TaskEmptyState";
import { TaskTable } from "#/components/tasks/TaskTable";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { GlowBg } from "#/components/ui/glow-bg";
import { SectionLabel } from "#/components/ui/section-label";
import { getSession } from "#/lib/auth.functions";
import { getTasksPageData } from "#/lib/task.functions";

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
    <main className="relative overflow-hidden">
      <GlowBg color="var(--teal)" size="size-[500px]" position="-right-48 -top-48" />

      <div className="page-wrap relative px-4 pb-16 pt-10 sm:pt-12">
        <section className="mb-8">
          <SectionLabel icon={CalendarClock} color="text-[var(--teal)]">
            Tasks
          </SectionLabel>
          <h1 className="display-title mt-4 mb-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Periodic <span className="text-[var(--teal)]">tasks</span>
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Scheduled AI tasks that run automatically on a cron schedule.
          </p>
        </section>

        {data.tasksDisabled && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="size-4" />
            <AlertDescription>
              {data.cronDisabled
                ? <>The scheduler is globally disabled (<code className="text-xs">DISABLE_CRON=true</code>). Tasks and system jobs will not run automatically.</>
                : <>File-based tasks are disabled (<code className="text-xs">DISABLE_TASKS=true</code>). System jobs (cleanup, calendar sync) are still running.</>
              }{" "}
              You can still trigger tasks manually.
            </AlertDescription>
          </Alert>
        )}

        {data.items.length === 0 ? <TaskEmptyState /> : <TaskTable items={data.items} />}
      </div>
    </main>
  );
}
