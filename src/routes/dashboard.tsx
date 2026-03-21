import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { useEffect } from "react";
import { DashboardBoardColumn } from "#/components/board/DashboardBoardColumn";
import { CalendarWidget } from "#/components/calendar/CalendarWidget";
import { NextEventCard } from "#/components/calendar/NextEventCard";
import { ActivityDigest } from "#/components/dashboard/ActivityDigest";
import { RecentChats } from "#/components/dashboard/RecentChats";
import { UsageStat } from "#/components/dashboard/UsageStat";
import { Spinner } from "#/components/ui/spinner";
import { getSession } from "#/lib/auth.functions";
import { authClient } from "#/lib/auth-client";
import { getBoardData } from "#/lib/board/board.functions";
import type { KanbanColumn } from "#/lib/board/kanban-parser";
import { getAllCalendarEvents } from "#/lib/calendar/calendar.functions";
import { getDashboardData } from "#/lib/dashboard.functions";
import { getCurrentHour } from "#/lib/date";
import { getDashboardBoardColumn } from "#/lib/preferences.functions";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  loader: async () => {
    const [calendarEvents, boardColumn, dashboardData] = await Promise.all([
      getAllCalendarEvents().catch(() => []),
      loadDashboardBoardColumn(),
      getDashboardData(),
    ]);
    const greeting = getGreeting();
    return { calendarEvents, greeting, boardColumn, dashboardData };
  },
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { calendarEvents, greeting, boardColumn, dashboardData } = Route.useLoaderData();
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
  const hasCalendar = calendarEvents.length > 0;

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

      {/* Main two-column layout */}
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_340px]">
        {/* Left column — primary content */}
        <div className="space-y-8">
          {/* Calendar */}
          {hasCalendar && (
            <section>
              <CalendarWidget events={calendarEvents}>
                <div className={`mt-4 grid items-start gap-4 ${boardColumn ? "sm:grid-cols-2" : ""}`}>
                  <NextEventCard events={calendarEvents} />
                  {boardColumn && <DashboardBoardColumn column={boardColumn} />}
                </div>
              </CalendarWidget>
            </section>
          )}

          {/* Board without calendar */}
          {!hasCalendar && boardColumn && (
            <section>
              <DashboardBoardColumn column={boardColumn} />
            </section>
          )}
        </div>

        {/* Right column — sidebar widgets */}
        <aside className="space-y-6">
          {/* Usage stat */}
          <UsageStat usage={dashboardData.usage} />

          {/* Recent chats */}
          <RecentChats threads={dashboardData.recentThreads} />

          {/* Activity digest */}
          <ActivityDigest items={dashboardData.recentActivity} />
        </aside>
      </div>
    </main>
  );
}

async function loadDashboardBoardColumn(): Promise<KanbanColumn | null> {
  try {
    const columnName = await getDashboardBoardColumn();
    if (!columnName) return null;

    const board = await getBoardData();
    if (!board.configured) return null;

    return board.columns.find((c) => c.name === columnName) ?? null;
  } catch {
    return null;
  }
}

function getGreeting(): string {
  const hour = getCurrentHour();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
