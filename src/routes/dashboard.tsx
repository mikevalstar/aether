import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { LayoutDashboard } from "lucide-react";
import { useEffect } from "react";
import { DashboardGrid } from "#/components/dashboard/DashboardGrid";
import { SectionLabel } from "#/components/ui/section-label";
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
    <main className="page-wrap px-4 pb-16 pt-6 sm:pt-8">
      <DashboardHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            FETCHING WIDGETS
            <Spinner size="sm" />
          </span>
        }
        title="Loading dashboard"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DASHBOARD_SKELETON_CARDS.map((card) => (
          <DashboardSkeletonCard key={card.key} rows={card.rows} />
        ))}
      </div>
    </main>
  );
}

/**
 * Dashboard header — eyebrow + accent rule + display title, matching the
 * Console redesign's PageHeader pattern. Lives here (rather than reusing
 * the global `PageHeader`) because the dashboard has a unique greeting +
 * date layout and skips the description / action slots.
 */
function DashboardHeader({
  eyebrow,
  title,
  highlight,
  date,
}: {
  eyebrow: React.ReactNode;
  title: string;
  highlight?: string;
  date?: Date;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 border-b border-border-strong pb-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="relative pl-4">
        <span aria-hidden className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-(--accent)" />
        <SectionLabel icon={LayoutDashboard}>{eyebrow}</SectionLabel>
        <h1 className="display-title mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
          {highlight && (
            <>
              , <span className="text-[var(--accent)]">{highlight}</span>
            </>
          )}
        </h1>
      </div>
      {date && (
        <time
          dateTime={format(date, "yyyy-MM-dd")}
          className="font-mono text-[11px] uppercase tracking-[0.15em] tabular-nums text-muted-foreground sm:text-[12px]"
        >
          {format(date, "EEEE · MMMM d")}
        </time>
      )}
    </header>
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
    <main className="page-wrap px-4 pb-16 pt-6 sm:pt-8">
      <DashboardHeader eyebrow="DASHBOARD" title={greeting} highlight={firstName ?? undefined} date={today} />

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
