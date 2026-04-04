import { SonarrClient } from "tsarr";

export type SonarrOptions = {
  base_url: string;
  api_key: string;
};

function createClient(opts: SonarrOptions): SonarrClient {
  return new SonarrClient({
    baseUrl: opts.base_url.replace(/\/+$/, ""),
    apiKey: opts.api_key,
  });
}

/** Unwrap tsarr response — throws on error */
function unwrap<T>(result: { data: T | undefined; error: unknown }): T {
  if (result.error !== undefined) {
    const msg = result.error instanceof Error ? result.error.message : String(result.error);
    throw new Error(`Sonarr API error: ${msg}`);
  }
  return result.data as T;
}

// ─── Series ───

export async function listSeries(opts: SonarrOptions) {
  const client = createClient(opts);
  const result = await client.getSeries();
  const series = unwrap(result);
  return (series ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    year: s.year,
    status: s.status,
    monitored: s.monitored,
    episodeFileCount: s.statistics?.episodeFileCount ?? 0,
    episodeCount: s.statistics?.episodeCount ?? 0,
    percentComplete: s.statistics?.percentOfEpisodes ?? 0,
    sizeOnDisk: s.statistics?.sizeOnDisk ?? 0,
    qualityProfileId: s.qualityProfileId,
    network: s.network,
    path: s.path,
  }));
}

export async function getSeriesById(opts: SonarrOptions, id: number) {
  const client = createClient(opts);
  const result = await client.getSeriesById(id);
  const s = unwrap(result);
  return {
    id: s.id,
    title: s.title,
    year: s.year,
    overview: s.overview,
    status: s.status,
    network: s.network,
    genres: s.genres,
    runtime: s.runtime,
    ratings: s.ratings,
    monitored: s.monitored,
    qualityProfileId: s.qualityProfileId,
    path: s.path,
    seasons: (s.seasons ?? []).map((season) => ({
      seasonNumber: season.seasonNumber,
      monitored: season.monitored,
      episodeCount: season.statistics?.episodeCount ?? 0,
      episodeFileCount: season.statistics?.episodeFileCount ?? 0,
      percentComplete: season.statistics?.percentOfEpisodes ?? 0,
    })),
    statistics: s.statistics,
    nextAiring: s.nextAiring,
    previousAiring: s.previousAiring,
  };
}

export async function findSeriesByTitle(opts: SonarrOptions, query: string) {
  const allSeries = await listSeries(opts);
  const lower = query.toLowerCase();
  return allSeries.filter((s) => s.title?.toLowerCase().includes(lower));
}

// ─── Calendar ───

export async function getUpcoming(opts: SonarrOptions, days: number) {
  const client = createClient(opts);
  const start = new Date().toISOString();
  const end = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const result = await client.getCalendar(start, end);
  const episodes = unwrap(result);
  return (episodes ?? []).map((e) => ({
    seriesTitle: e.series?.title,
    seriesId: e.seriesId,
    seasonNumber: e.seasonNumber,
    episodeNumber: e.episodeNumber,
    title: e.title,
    airDateUtc: e.airDateUtc,
    overview: e.overview,
    hasFile: e.hasFile,
  }));
}

// ─── Queue ───

export async function getQueue(opts: SonarrOptions) {
  const client = createClient(opts);
  const result = await client.getQueue(1, 50);
  const queue = unwrap(result);
  return (queue?.records ?? []).map((q) => ({
    seriesTitle: q.series?.title,
    episodeTitle: q.episode?.title,
    seasonNumber: q.episode?.seasonNumber,
    episodeNumber: q.episode?.episodeNumber,
    quality: q.quality?.quality?.name,
    status: q.status,
    trackedDownloadState: q.trackedDownloadState,
    trackedDownloadStatus: q.trackedDownloadStatus,
    progress:
      q.sizeleft != null && q.size != null && q.size > 0 ? Math.round(((q.size - q.sizeleft) / q.size) * 100) : undefined,
    estimatedCompletionTime: q.estimatedCompletionTime,
    downloadClient: q.downloadClient,
  }));
}

// ─── History ───

export async function getHistory(opts: SonarrOptions, limit: number) {
  const client = createClient(opts);
  const result = await client.getHistory(1, limit, "date", "descending");
  const history = unwrap(result);
  return (history?.records ?? []).map((h) => ({
    seriesTitle: h.series?.title,
    episodeTitle: h.episode?.title,
    seasonNumber: h.episode?.seasonNumber,
    episodeNumber: h.episode?.episodeNumber,
    quality: h.quality?.quality?.name,
    eventType: h.eventType,
    date: h.date,
  }));
}

// ─── Wanted / Missing ───

export async function getWantedMissing(opts: SonarrOptions, limit: number) {
  const client = createClient(opts);
  const result = await client.getWantedMissing(1, limit, "airDateUtc", "descending");
  const wanted = unwrap(result);
  return (wanted?.records ?? []).map((e) => ({
    seriesTitle: e.series?.title,
    seriesId: e.seriesId,
    seasonNumber: e.seasonNumber,
    episodeNumber: e.episodeNumber,
    title: e.title,
    airDateUtc: e.airDateUtc,
    monitored: e.monitored,
  }));
}

// ─── Search (lookup new series) ───

export async function searchNewSeries(opts: SonarrOptions, term: string) {
  const client = createClient(opts);
  const [lookupResult, existingResult] = await Promise.all([client.searchSeries(term), client.getSeries()]);
  const results = unwrap(lookupResult);
  const existing = unwrap(existingResult);
  const existingTvdbIds = new Set((existing ?? []).map((s) => s.tvdbId));

  return (results ?? []).map((s) => ({
    title: s.title,
    year: s.year,
    overview: s.overview,
    tvdbId: s.tvdbId,
    imdbId: s.imdbId,
    network: s.network,
    status: s.status,
    seasonCount: s.statistics?.seasonCount ?? s.seasons?.length ?? 0,
    alreadyInLibrary: existingTvdbIds.has(s.tvdbId),
  }));
}

// ─── Add Series ───

export async function addNewSeries(
  opts: SonarrOptions,
  tvdbId: number,
  qualityProfileId?: number,
  monitored = true,
  searchForMissingEpisodes = true,
) {
  const client = createClient(opts);

  // Lookup the series to get full data needed for adding
  const lookupResult = await client.searchSeries(`tvdb:${tvdbId}`);
  const lookupData = unwrap(lookupResult);
  const seriesData = (lookupData ?? []).find((s) => s.tvdbId === tvdbId);
  if (!seriesData) throw new Error(`Series with tvdbId ${tvdbId} not found`);

  // Get root folder and quality profile defaults
  const [rootFoldersResult, profilesResult] = await Promise.all([client.getRootFolders(), client.getQualityProfiles()]);
  const rootFolders = unwrap(rootFoldersResult);
  const profiles = unwrap(profilesResult);

  if (!rootFolders?.length) throw new Error("No root folders configured in Sonarr");
  const rootFolder = rootFolders[0];

  const profileId = qualityProfileId ?? profiles?.[0]?.id;
  if (!profileId) throw new Error("No quality profiles configured in Sonarr");

  const result = await client.addSeries({
    ...seriesData,
    rootFolderPath: rootFolder.path,
    qualityProfileId: profileId,
    monitored,
    addOptions: {
      searchForMissingEpisodes,
      monitor: monitored ? ("all" as unknown as undefined) : ("none" as unknown as undefined),
    },
  });
  const added = unwrap(result);
  return {
    id: added.id,
    title: added.title,
    path: added.path,
    monitored: added.monitored,
    qualityProfileId: added.qualityProfileId,
  };
}

// ─── Command (episode search) ───

export async function searchEpisodes(opts: SonarrOptions, seriesId: number, seasonNumber?: number) {
  const client = createClient(opts);

  if (seasonNumber != null) {
    const result = await client.runCommand({
      name: "SeasonSearch",
      seriesId,
      seasonNumber,
    } as any);
    unwrap(result);
    return { triggered: true, type: "season", seriesId, seasonNumber };
  }

  const result = await client.runCommand({
    name: "SeriesSearch",
    seriesId,
  } as any);
  unwrap(result);
  return { triggered: true, type: "series", seriesId };
}

// ─── System Status (health check / test) ───

export async function getSystemStatus(opts: SonarrOptions) {
  const client = createClient(opts);
  const result = await client.getSystemStatus();
  return unwrap(result) as { version?: string; [key: string]: unknown };
}

export async function testConnection(opts: SonarrOptions): Promise<{ success: boolean; message: string }> {
  try {
    const status = await getSystemStatus(opts);
    return { success: true, message: `Connected — Sonarr v${status.version ?? "unknown"}` };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Connection failed" };
  }
}
