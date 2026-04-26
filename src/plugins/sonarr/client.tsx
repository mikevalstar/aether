import { format, formatDistanceToNow, parseISO } from "date-fns";
import { CalendarClock, History, Tv } from "lucide-react";
import { WidgetCard } from "#/components/dashboard/WidgetCard";
import type { AetherPluginClient, PluginWidget } from "../types";

type UpcomingEpisode = {
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  title?: string;
  airDateUtc?: string;
  hasFile?: boolean;
};

type HistoryItem = {
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  eventType?: string;
  date?: string;
};

function epCode(season?: number, episode?: number) {
  if (season == null || episode == null) return "";
  return `S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
}

const EVENT_LABELS: Record<string, string> = {
  grabbed: "grabbed",
  downloadFolderImported: "imported",
  downloadFailed: "failed",
  downloadIgnored: "ignored",
  episodeFileDeleted: "deleted",
  episodeFileRenamed: "renamed",
  seriesFolderImported: "imported",
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

function NotConfigured({ title }: { title: string }) {
  return (
    <WidgetCard icon={Tv} title={title}>
      <p className="text-xs text-muted-foreground">
        Sonarr is not configured. Go to Settings &gt; Plugins &gt; Sonarr to set up.
      </p>
    </WidgetCard>
  );
}

function ErrorBlock({ title, error }: { title: string; error: string }) {
  return (
    <WidgetCard icon={Tv} title={title}>
      <p className="text-xs text-destructive">{error}</p>
    </WidgetCard>
  );
}

function SonarrUpcomingWidget({
  data,
}: {
  ctx: { pluginId: string; options: Record<string, unknown> };
  data: Record<string, unknown>;
}) {
  const configured = data.configured as boolean;
  const error = data.error as string | undefined;
  const upcoming = (data.upcoming as UpcomingEpisode[]) ?? [];

  if (!configured) return <NotConfigured title="Sonarr — Upcoming" />;
  if (error) return <ErrorBlock title="Sonarr — Upcoming" error={error} />;

  return (
    <WidgetCard icon={CalendarClock} title="Sonarr — Upcoming">
      {upcoming.length === 0 ? (
        <p className="text-xs text-muted-foreground">No episodes airing in the next 7 days.</p>
      ) : (
        <ul className="space-y-1.5">
          {upcoming.slice(0, 10).map((e) => (
            <li
              key={`${e.airDateUtc ?? ""}-${e.seriesTitle ?? ""}-${e.seasonNumber ?? ""}-${e.episodeNumber ?? ""}`}
              className="flex items-baseline justify-between gap-2 text-xs"
            >
              <div className="min-w-0 flex-1">
                <span className="font-medium truncate">{e.seriesTitle ?? "Unknown"}</span>
                <span className="ml-1.5 text-muted-foreground tabular-nums">{epCode(e.seasonNumber, e.episodeNumber)}</span>
                {e.title ? <span className="ml-1.5 text-muted-foreground/80 truncate">— {e.title}</span> : null}
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground/70 tabular-nums">
                {e.airDateUtc ? format(parseISO(e.airDateUtc), "MMM d") : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

function SonarrRecentWidget({
  data,
}: {
  ctx: { pluginId: string; options: Record<string, unknown> };
  data: Record<string, unknown>;
}) {
  const configured = data.configured as boolean;
  const error = data.error as string | undefined;
  const recent = (data.recent as HistoryItem[]) ?? [];

  if (!configured) return <NotConfigured title="Sonarr — Recent" />;
  if (error) return <ErrorBlock title="Sonarr — Recent" error={error} />;

  return (
    <WidgetCard icon={History} title="Sonarr — Recent">
      {recent.length === 0 ? (
        <p className="text-xs text-muted-foreground">No recent activity.</p>
      ) : (
        <ul className="space-y-1.5">
          {recent.slice(0, 10).map((h) => (
            <li
              key={`${h.date ?? ""}-${h.seriesTitle ?? ""}-${h.seasonNumber ?? ""}-${h.episodeNumber ?? ""}-${h.eventType ?? ""}`}
              className="flex items-baseline justify-between gap-2 text-xs"
            >
              <div className="min-w-0 flex-1">
                <span className="font-medium truncate">{h.seriesTitle ?? "Unknown"}</span>
                <span className="ml-1.5 text-muted-foreground tabular-nums">{epCode(h.seasonNumber, h.episodeNumber)}</span>
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

const sonarrUpcomingWidget: PluginWidget = {
  id: "upcoming",
  label: "Sonarr — Upcoming",
  size: "half",
  component: SonarrUpcomingWidget,
};

const sonarrRecentWidget: PluginWidget = {
  id: "recent",
  label: "Sonarr — Recent",
  size: "half",
  component: SonarrRecentWidget,
};

export const sonarrClient: AetherPluginClient = {
  widgets: [sonarrUpcomingWidget, sonarrRecentWidget],
  commands: [
    {
      label: "Sonarr Settings",
      icon: Tv,
      route: "/settings/plugins/sonarr",
    },
  ],
};
