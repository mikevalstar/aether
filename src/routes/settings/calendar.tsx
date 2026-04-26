import { createFileRoute, getRouteApi, useRouter } from "@tanstack/react-router";
import { Calendar } from "lucide-react";
import { useState } from "react";
import { CalendarFeedManager } from "#/components/calendar/CalendarFeedManager";
import { Button } from "#/components/ui/button";
import { SectionLabel } from "#/components/ui/section-label";
import { toast } from "#/components/ui/sonner";
import { type FeedSyncResult, syncCalendarFeedsNow } from "#/lib/calendar/calendar.functions";
import type { CalendarFeed } from "#/lib/calendar/types";
import { updateUserPreferences } from "#/lib/preferences.functions";

const settingsRoute = getRouteApi("/settings");

export const Route = createFileRoute("/settings/calendar")({
  component: CalendarSection,
});

function CalendarSection() {
  const data = settingsRoute.useLoaderData();
  const router = useRouter();

  const [calendarFeeds, setCalendarFeeds] = useState<CalendarFeed[]>(data.preferences.calendarFeeds || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<FeedSyncResult[] | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
          const invalidFeed = calendarFeeds.find((f) => !f.name.trim() || !f.url.trim());
          if (invalidFeed) {
            toast.error("Each calendar feed needs a name and URL");
            setIsSaving(false);
            return;
          }
          await updateUserPreferences({ data: { calendarFeeds } });
          toast.success("Calendar feeds saved");
          router.invalidate();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to save calendar feeds");
        } finally {
          setIsSaving(false);
        }
      }}
      className="surface-card flex flex-col gap-5 p-6"
    >
      <header className="flex flex-col gap-1.5">
        <SectionLabel icon={Calendar}>Calendar Feeds</SectionLabel>
        <p className="text-sm text-muted-foreground">
          Add iCal feed URLs to sync your calendars. Events will be available on the dashboard and to the AI.
        </p>
      </header>

      <CalendarFeedManager feeds={calendarFeeds} onChange={setCalendarFeeds} />

      <div className="mt-1 flex flex-wrap gap-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save calendar feeds"}
        </Button>
        {calendarFeeds.length > 0 && (
          <Button
            type="button"
            variant="outline"
            disabled={isSyncing}
            onClick={async () => {
              setIsSyncing(true);
              setSyncResults(null);
              try {
                const results = await syncCalendarFeedsNow();
                setSyncResults(results);
                const failed = results.filter((r) => !r.success);
                if (failed.length === 0) {
                  toast.success(`Synced ${results.length} feed(s) successfully`);
                } else {
                  toast.error(`${failed.length} feed(s) failed to sync`);
                }
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Sync failed");
              } finally {
                setIsSyncing(false);
              }
            }}
          >
            {isSyncing ? "Syncing..." : "Sync now"}
          </Button>
        )}
      </div>

      {syncResults && syncResults.length > 0 && (
        <div className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-3">
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--ink-soft)]">
            Sync results
          </p>
          <div className="grid gap-1.5">
            {syncResults.map((r) => (
              <div key={r.feedId} className="flex items-start gap-2 text-xs">
                <span
                  className={
                    r.success
                      ? "font-mono text-[10px] font-semibold tracking-wider text-emerald-600 dark:text-emerald-400"
                      : "font-mono text-[10px] font-semibold tracking-wider text-destructive"
                  }
                >
                  {r.success ? "OK" : "ERR"}
                </span>
                <span className="font-medium">{r.feedName}</span>
                {r.success && <span className="text-muted-foreground">{r.eventCount} events</span>}
                {r.error && <span className="text-destructive">{r.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
