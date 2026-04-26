import { format, formatDistanceToNow, parseISO } from "date-fns";
import { CalendarClock, Film, History } from "lucide-react";
import { WidgetCard } from "#/components/dashboard/WidgetCard";
import type { AetherPluginClient, PluginWidget } from "../types";

type UpcomingMovie = {
  id?: number;
  title?: string;
  year?: number;
  inCinemas?: string;
  digitalRelease?: string;
  physicalRelease?: string;
  hasFile?: boolean;
};

type HistoryItem = {
  movieTitle?: string;
  quality?: string;
  eventType?: string;
  date?: string;
};

const EVENT_LABELS: Record<string, string> = {
  grabbed: "grabbed",
  downloadFolderImported: "imported",
  downloadFailed: "failed",
  downloadIgnored: "ignored",
  movieFileDeleted: "deleted",
  movieFileRenamed: "renamed",
  movieFolderImported: "imported",
};

function humanEvent(eventType?: string) {
  if (!eventType) return "";
  return (
    EVENT_LABELS[eventType] ??
    eventType
      .replace(/([A-Z])/g, " $1")
      .toLowerCase()
      .trim()
  );
}

/** Pick the soonest future release date across cinema/digital/physical. */
function nextReleaseDate(m: UpcomingMovie): string | undefined {
  const candidates = [m.inCinemas, m.digitalRelease, m.physicalRelease].filter((d): d is string => !!d);
  if (candidates.length === 0) return undefined;
  return candidates.sort()[0];
}

function NotConfigured({ title }: { title: string }) {
  return (
    <WidgetCard icon={Film} title={title}>
      <p className="text-xs text-muted-foreground">
        Radarr is not configured. Go to Settings &gt; Plugins &gt; Radarr to set up.
      </p>
    </WidgetCard>
  );
}

function ErrorBlock({ title, error }: { title: string; error: string }) {
  return (
    <WidgetCard icon={Film} title={title}>
      <p className="text-xs text-destructive">{error}</p>
    </WidgetCard>
  );
}

function RadarrUpcomingWidget({
  data,
}: {
  ctx: { pluginId: string; options: Record<string, unknown> };
  data: Record<string, unknown>;
}) {
  const configured = data.configured as boolean;
  const error = data.error as string | undefined;
  const upcoming = (data.upcoming as UpcomingMovie[]) ?? [];

  if (!configured) return <NotConfigured title="Radarr — Upcoming" />;
  if (error) return <ErrorBlock title="Radarr — Upcoming" error={error} />;

  return (
    <WidgetCard icon={CalendarClock} title="Radarr — Upcoming">
      {upcoming.length === 0 ? (
        <p className="text-xs text-muted-foreground">No movies releasing in the next 30 days.</p>
      ) : (
        <ul className="space-y-1.5">
          {upcoming.slice(0, 10).map((m) => {
            const d = nextReleaseDate(m);
            return (
              <li
                key={`${m.id ?? ""}-${m.title ?? ""}-${d ?? ""}`}
                className="flex items-baseline justify-between gap-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium truncate">{m.title ?? "Unknown"}</span>
                  {m.year ? <span className="ml-1.5 text-muted-foreground tabular-nums">({m.year})</span> : null}
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground/70 tabular-nums">
                  {d ? format(parseISO(d), "MMM d") : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}

function RadarrRecentWidget({
  data,
}: {
  ctx: { pluginId: string; options: Record<string, unknown> };
  data: Record<string, unknown>;
}) {
  const configured = data.configured as boolean;
  const error = data.error as string | undefined;
  const recent = (data.recent as HistoryItem[]) ?? [];

  if (!configured) return <NotConfigured title="Radarr — Recent" />;
  if (error) return <ErrorBlock title="Radarr — Recent" error={error} />;

  return (
    <WidgetCard icon={History} title="Radarr — Recent">
      {recent.length === 0 ? (
        <p className="text-xs text-muted-foreground">No recent activity.</p>
      ) : (
        <ul className="space-y-1.5">
          {recent.slice(0, 10).map((h) => (
            <li
              key={`${h.date ?? ""}-${h.movieTitle ?? ""}-${h.eventType ?? ""}`}
              className="flex items-baseline justify-between gap-2 text-xs"
            >
              <div className="min-w-0 flex-1">
                <span className="font-medium truncate">{h.movieTitle ?? "Unknown"}</span>
                {h.eventType ? (
                  <span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                    {humanEvent(h.eventType)}
                  </span>
                ) : null}
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground/70">
                {h.date ? formatDistanceToNow(parseISO(h.date), { addSuffix: true }) : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

const radarrUpcomingWidget: PluginWidget = {
  id: "upcoming",
  label: "Radarr — Upcoming",
  size: "half",
  component: RadarrUpcomingWidget,
};

const radarrRecentWidget: PluginWidget = {
  id: "recent",
  label: "Radarr — Recent",
  size: "half",
  component: RadarrRecentWidget,
};

export const radarrClient: AetherPluginClient = {
  widgets: [radarrUpcomingWidget, radarrRecentWidget],
  commands: [
    {
      label: "Radarr Settings",
      icon: Film,
      route: "/settings/plugins/radarr",
    },
  ],
};
