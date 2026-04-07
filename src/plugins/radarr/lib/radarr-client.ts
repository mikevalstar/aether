import { RadarrClient } from "tsarr";

export type RadarrOptions = {
  base_url: string;
  api_key: string;
};

function createClient(opts: RadarrOptions): RadarrClient {
  return new RadarrClient({
    baseUrl: opts.base_url.replace(/\/+$/, ""),
    apiKey: opts.api_key,
  });
}

/** Unwrap tsarr response — throws on error */
function unwrap<T>(result: { data: T | undefined; error: unknown }): T {
  if (result.error !== undefined) {
    const msg = result.error instanceof Error ? result.error.message : String(result.error);
    throw new Error(`Radarr API error: ${msg}`);
  }
  return result.data as T;
}

// ─── Movies ───

export async function listMovies(opts: RadarrOptions) {
  const client = createClient(opts);
  const result = await client.getMovies();
  const movies = unwrap(result);
  return (movies ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    year: m.year,
    status: m.status,
    monitored: m.monitored,
    hasFile: m.hasFile,
    sizeOnDisk: m.sizeOnDisk,
    qualityProfileId: m.qualityProfileId,
    studio: m.studio,
    path: m.path,
    imdbId: m.imdbId,
    tmdbId: m.tmdbId,
    runtime: m.runtime,
    movieFileId: m.movieFileId,
  }));
}

export async function getMovieById(opts: RadarrOptions, id: number) {
  const client = createClient(opts);
  const result = await client.getMovie(id);
  const m = unwrap(result);
  return {
    id: m.id,
    title: m.title,
    originalTitle: m.originalTitle,
    year: m.year,
    overview: m.overview,
    status: m.status,
    studio: m.studio,
    genres: m.genres,
    runtime: m.runtime,
    ratings: m.ratings,
    certification: m.certification,
    monitored: m.monitored,
    hasFile: m.hasFile,
    qualityProfileId: m.qualityProfileId,
    path: m.path,
    imdbId: m.imdbId,
    tmdbId: m.tmdbId,
    sizeOnDisk: m.sizeOnDisk,
    inCinemas: m.inCinemas,
    physicalRelease: m.physicalRelease,
    digitalRelease: m.digitalRelease,
    added: m.added,
    movieFile: m.movieFile
      ? {
          id: m.movieFile.id,
          relativePath: m.movieFile.relativePath,
          size: m.movieFile.size,
          quality: m.movieFile.quality?.quality?.name,
          dateAdded: m.movieFile.dateAdded,
        }
      : null,
  };
}

export async function findMovieByTitle(opts: RadarrOptions, query: string) {
  const allMovies = await listMovies(opts);
  const lower = query.toLowerCase();
  return allMovies.filter((m) => m.title?.toLowerCase().includes(lower));
}

// ─── Movie File Deletion ───

export async function deleteMovieFile(opts: RadarrOptions, movieFileId: number) {
  const client = createClient(opts);
  unwrap(await client.deleteMovieFile(movieFileId));
  return { deleted: true, movieFileId };
}

// ─── Calendar ───

export async function getUpcoming(opts: RadarrOptions, days: number) {
  const client = createClient(opts);
  const start = new Date().toISOString();
  const end = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const result = await client.getCalendar(start, end);
  const movies = unwrap(result);
  return (movies ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    year: m.year,
    status: m.status,
    monitored: m.monitored,
    hasFile: m.hasFile,
    inCinemas: m.inCinemas,
    physicalRelease: m.physicalRelease,
    digitalRelease: m.digitalRelease,
    overview: m.overview,
  }));
}

// ─── Queue ───

export async function getQueue(opts: RadarrOptions) {
  const client = createClient(opts);
  const result = await client.getQueue(1, 50);
  const queue = unwrap(result);
  return (queue?.records ?? []).map((q) => ({
    movieTitle: q.movie?.title,
    movieId: q.movieId,
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

export async function getHistory(opts: RadarrOptions, limit: number) {
  const client = createClient(opts);
  const result = await client.getHistory(1, limit, "date", "descending");
  const history = unwrap(result);
  const records = history?.records ?? [];

  // tsarr's getHistory doesn't populate the embedded movie object — join via listMovies().
  const movies = await listMovies(opts);
  const movieById = new Map(movies.map((m) => [m.id, { title: m.title, year: m.year }]));

  return records.map((h) => {
    const m = h.movieId != null ? movieById.get(h.movieId) : undefined;
    return {
      movieId: h.movieId,
      movieTitle: h.movie?.title ?? m?.title,
      year: m?.year,
      quality: h.quality?.quality?.name,
      eventType: h.eventType,
      date: h.date,
    };
  });
}

// ─── Wanted / Missing ───

export async function getWantedMissing(opts: RadarrOptions, limit: number) {
  const client = createClient(opts);
  const result = await client.getWantedMissing(1, limit);
  const wanted = unwrap(result);
  return (wanted?.records ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    year: m.year,
    monitored: m.monitored,
    hasFile: m.hasFile,
    status: m.status,
    inCinemas: m.inCinemas,
    physicalRelease: m.physicalRelease,
    digitalRelease: m.digitalRelease,
  }));
}

// ─── Search (lookup new movies) ───

export async function searchNewMovies(opts: RadarrOptions, term: string) {
  const client = createClient(opts);
  const [lookupResult, existingResult] = await Promise.all([client.searchMovies(term), client.getMovies()]);
  const results = unwrap(lookupResult);
  const existing = unwrap(existingResult);
  const existingTmdbIds = new Set((existing ?? []).map((m) => m.tmdbId));

  return (results ?? []).map((m) => ({
    title: m.title,
    year: m.year,
    overview: m.overview,
    tmdbId: m.tmdbId,
    imdbId: m.imdbId,
    studio: m.studio,
    status: m.status,
    runtime: m.runtime,
    ratings: m.ratings,
    alreadyInLibrary: existingTmdbIds.has(m.tmdbId),
  }));
}

// ─── Add Movie ───

export async function addNewMovie(
  opts: RadarrOptions,
  tmdbId: number,
  qualityProfileId?: number,
  monitored = true,
  searchForMovie = true,
) {
  const client = createClient(opts);

  // Lookup the movie to get full data needed for adding
  const lookupResult = await client.lookupMovieByTmdbId(tmdbId);
  const movieData = unwrap(lookupResult);
  if (!movieData) throw new Error(`Movie with tmdbId ${tmdbId} not found`);

  // Get root folder and quality profile defaults
  const [rootFoldersResult, profilesResult] = await Promise.all([client.getRootFolders(), client.getQualityProfiles()]);
  const rootFolders = unwrap(rootFoldersResult);
  const profiles = unwrap(profilesResult);

  if (!rootFolders?.length) throw new Error("No root folders configured in Radarr");
  const rootFolder = rootFolders[0];

  const profileId = qualityProfileId ?? profiles?.[0]?.id;
  if (!profileId) throw new Error("No quality profiles configured in Radarr");

  const result = await client.addMovie({
    ...movieData,
    rootFolderPath: rootFolder.path,
    qualityProfileId: profileId,
    monitored,
    addOptions: {
      searchForMovie,
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

// ─── Command (movie search) ───

export async function searchMovie(opts: RadarrOptions, movieIds: number[]) {
  const client = createClient(opts);
  // biome-ignore lint/suspicious/noExplicitAny: tsarr CommandResource doesn't type command-specific fields like movieIds
  const result = await client.runCommand({ name: "MoviesSearch", movieIds } as any);
  unwrap(result);
  return { triggered: true, movieIds };
}

// ─── System Status (health check / test) ───

export async function getSystemStatus(opts: RadarrOptions) {
  const client = createClient(opts);
  const result = await client.getSystemStatus();
  return unwrap(result) as { version?: string; [key: string]: unknown };
}

export async function testConnection(opts: RadarrOptions): Promise<{ success: boolean; message: string }> {
  try {
    const status = await getSystemStatus(opts);
    return { success: true, message: `Connected — Radarr v${status.version ?? "unknown"}` };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Connection failed" };
  }
}
