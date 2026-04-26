import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { useEffect } from "react";
import { DashboardGrid } from "#/components/dashboard/DashboardGrid";
import { Skeleton } from "#/components/ui/skeleton";
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
  // Swap to the dashboard shell immediately (no /login stall) — render
  // the skeleton while the loader's parallel fetches resolve.
  pendingMs: 0,
  pendingComponent: DashboardPending,
  component: DashboardPage,
});

function DashboardPending() {
  return (
    <main className="page-wrap px-4 pb-16 pt-8 sm:pt-10">
      <header className="mb-8 flex items-baseline justify-between">
        <h1 className="display-title text-2xl font-bold tracking-tight sm:text-3xl">
          <span className="inline-flex items-center gap-3">
            Loading dashboard
            <Spinner size="sm" />
          </span>
        </h1>
        <span className="hidden font-mono text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground sm:inline">
          ◆ FETCHING WIDGETS
        </span>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DASHBOARD_SKELETON_CARDS.map((card) => (
          <DashboardSkeletonCard key={card.key} rows={card.rows} />
        ))}
      </div>
    </main>
  );
}

const DASHBOARD_SKELETON_CARDS = [
  { key: "a", rows: 5 },
  { key: "b", rows: 3 },
  { key: "c", rows: 3 },
  { key: "d", rows: 5 },
  { key: "e", rows: 3 },
  { key: "f", rows: 4 },
] as const;

const SKELETON_ROW_WIDTHS = [78, 64, 92, 56, 70];

function DashboardSkeletonCard({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24 bg-[var(--line)]" />
        <Skeleton className="size-4 rounded bg-[var(--line)]" />
      </div>
      <div className="flex flex-col gap-2 pt-1">
        {SKELETON_ROW_WIDTHS.slice(0, rows).map((width) => (
          <Skeleton key={width} className="h-3.5 bg-[var(--line)]" style={{ width: `${width}%` }} />
        ))}
      </div>
    </div>
  );
}

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
