import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { useEffect } from "react";
import { DashboardGrid } from "#/components/dashboard/DashboardGrid";
import { Spinner } from "#/components/ui/spinner";
import { getSession } from "#/lib/auth.functions";
import { authClient } from "#/lib/auth-client";
import { getAllCalendarEvents } from "#/lib/calendar/calendar.functions";
import { loadDashboardLayout } from "#/lib/dashboard/layout-persistence";
import { getDashboardData } from "#/lib/dashboard.functions";
import { getCurrentHour } from "#/lib/date";
import { loadDashboardPluginWidgets, type PluginWidgetInfo } from "#/plugins/dashboard.functions";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  loader: async () => {
    const [calendarEvents, dashboardData, pluginWidgets, savedLayouts] = await Promise.all([
      getAllCalendarEvents().catch(() => []),
      getDashboardData(),
      loadDashboardPluginWidgets().catch(() => [] as PluginWidgetInfo[]),
      loadDashboardLayout().catch(() => null),
    ]);
    const greeting = getGreeting();
    return { calendarEvents, greeting, dashboardData, pluginWidgets, savedLayouts };
  },
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { calendarEvents, greeting, dashboardData, pluginWidgets, savedLayouts } = Route.useLoaderData();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session?.user) {
      void navigate({ to: "/login" });
    }
  }, [session, isPending, navigate]);

  if (isPending || !session?.user) {
    return (
      <main className="page-wrap flex items-center justify-center px-4 py-20">
        <Spinner />
      </main>
    );
  }

  const user = session.user;
  const firstName = user.name ? user.name.split(" ")[0] : null;
  const today = new Date();

  return (
    <main className="page-wrap px-4 pb-16 pt-8 sm:pt-10">
      {/* Compact header — greeting + date on one line */}
      <header className="mb-8 flex items-baseline justify-between">
        <h1 className="display-title text-2xl font-bold tracking-tight sm:text-3xl">
          {greeting}
          {firstName && (
            <>
              , <span className="text-[var(--teal)]">{firstName}</span>
            </>
          )}
        </h1>
        <time dateTime={format(today, "yyyy-MM-dd")} className="hidden text-sm tabular-nums text-muted-foreground sm:block">
          {format(today, "EEEE, MMMM d")}
        </time>
      </header>

      {/* Masonry grid layout */}
      <DashboardGrid
        calendarEvents={calendarEvents}
        dashboardData={dashboardData}
        pluginWidgets={pluginWidgets}
        savedLayouts={savedLayouts}
      />
    </main>
  );
}

function getGreeting(): string {
  const hour = getCurrentHour();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
