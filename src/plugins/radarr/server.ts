import { type JSONValue, search as jmespath } from "@metrichor/jmespath";
import { tool } from "ai";
import { z } from "zod";
import { logger } from "#/lib/logger";
import type { AetherPluginServer } from "../types";
import {
  addNewMovie,
  deleteMovieFile,
  findMovieByTitle,
  getHistory,
  getMovieById,
  getQueue,
  getSystemStatus,
  getUpcoming,
  getWantedMissing,
  listMovies,
  type RadarrOptions,
  searchMovie,
  searchNewMovies,
} from "./lib/radarr-client";

/** Apply an optional JMESPath filter to an array of results. Returns the original array on invalid expressions. */
function applyFilter(items: Record<string, unknown>[], filter?: string): { items: unknown; filtered: boolean } {
  if (!filter) return { items, filtered: false };
  try {
    const result = jmespath(items as unknown as JSONValue, filter);
    return { items: Array.isArray(result) ? result : [result], filtered: true };
  } catch (err) {
    logger.warn({ err, filter }, "Radarr: invalid JMESPath filter, returning unfiltered results");
    return { items, filtered: false };
  }
}

const filterParam = z
  .string()
  .optional()
  .describe(
    'Optional JMESPath expression to filter/transform results. Examples: "[?monitored]", "[?hasFile]", "[?year > `2020`].{title: title, year: year}"',
  );

export const radarrServer: AetherPluginServer = {
  systemPrompt: `You have access to Radarr tools for managing movie downloads. Use these tools when the user asks about movies, film downloads, or their movie library:
- radarr_list_movies: List all tracked movies with status
- radarr_get_movie: Get detailed info about a specific movie (by title or ID)
- radarr_upcoming: Check upcoming movie releases (cinema, digital, physical)
- radarr_queue: See what's currently downloading
- radarr_history: View recent download history
- radarr_wanted: List missing movies that haven't been downloaded
- radarr_search_new: Search for new movies to add (searches TMDB)
- radarr_add_movie: Add a new movie (always search first and confirm with user)
- radarr_delete_movie_file: Delete a movie's file from disk (by movieFileId from get_movie)
- radarr_search_movie: Trigger a download search for specific movies

For adding movies: always use radarr_search_new first to find the tmdbId, then confirm with the user before calling radarr_add_movie.
For movie searches: confirm with the user before triggering radarr_search_movie as it will actively search indexers.
For re-downloading: use radarr_get_movie to find the movieFile.id, radarr_delete_movie_file to remove it, then radarr_search_movie to grab a new copy.

List tools (list_movies, upcoming, queue, history, wanted, search_new) support an optional \`filter\` parameter — a JMESPath expression to filter or reshape results. Examples:
- \`[?monitored]\` — only monitored movies
- \`[?hasFile]\` — only movies with files downloaded
- \`[?year > \\\`2020\\\`].{title: title, year: year}\` — recent movies with selected fields`,

  createTools(ctx) {
    async function getRadarrOptions(): Promise<RadarrOptions> {
      const opts = await ctx.getOptions<Partial<RadarrOptions>>();
      if (!opts.base_url || !opts.api_key) {
        throw new Error(
          "Radarr plugin is not configured. Please set up the URL and API key in Settings > Plugins > Radarr.",
        );
      }
      return { base_url: opts.base_url, api_key: opts.api_key };
    }

    return {
      list_movies: tool({
        description: "List all movies in Radarr with their monitoring status, file status, and quality.",
        inputSchema: z.object({ filter: filterParam }),
        execute: async ({ filter }) => {
          logger.info({ filter, userId: ctx.userId }, "Radarr tool: list_movies invoked");
          try {
            const opts = await getRadarrOptions();
            const movies = await listMovies(opts);
            const { items, filtered } = applyFilter(movies, filter);
            await ctx.logActivity({
              type: "radarr_query",
              summary: `Listed ${movies.length} movies${filtered ? " (filtered)" : ""}`,
              metadata: { count: movies.length, filtered },
            });
            return { movies: items, totalCount: movies.length, filtered };
          } catch (err) {
            logger.error({ err, userId: ctx.userId }, "Radarr tool: list_movies failed");
            return { error: err instanceof Error ? err.message : "Failed to list movies" };
          }
        },
      }),

      get_movie: tool({
        description:
          "Get detailed information about a specific movie including file info, ratings, and release dates. Search by title or Radarr movie ID.",
        inputSchema: z.object({
          query: z.string().describe("Movie title (fuzzy match) or numeric Radarr movie ID"),
        }),
        execute: async ({ query }) => {
          logger.info({ query, userId: ctx.userId }, "Radarr tool: get_movie invoked");
          try {
            const opts = await getRadarrOptions();
            const id = Number(query);
            if (!Number.isNaN(id) && String(id) === query.trim()) {
              return await getMovieById(opts, id);
            }
            const matches = await findMovieByTitle(opts, query);
            if (matches.length === 0) return { error: `No movie found matching "${query}"` };
            if (matches.length === 1 && matches[0].id != null) {
              return await getMovieById(opts, matches[0].id);
            }
            return {
              message: `Multiple matches found for "${query}". Please clarify:`,
              matches: matches.map((m) => ({ id: m.id, title: m.title, year: m.year })),
            };
          } catch (err) {
            logger.error({ err, query, userId: ctx.userId }, "Radarr tool: get_movie failed");
            return { error: err instanceof Error ? err.message : "Failed to get movie" };
          }
        },
      }),

      delete_movie_file: tool({
        description:
          "Delete a movie's file from disk. Use get_movie first to find the movieFile.id. This removes the file permanently — confirm with the user before calling.",
        inputSchema: z.object({
          movieFileId: z.number().describe("Movie file ID (from get_movie movieFile.id)"),
        }),
        execute: async ({ movieFileId }) => {
          logger.info({ movieFileId, userId: ctx.userId }, "Radarr tool: delete_movie_file invoked");
          try {
            const opts = await getRadarrOptions();
            const result = await deleteMovieFile(opts, movieFileId);
            await ctx.logActivity({
              type: "radarr_action",
              summary: `Deleted movie file ${movieFileId}`,
              metadata: { movieFileId },
            });
            return { success: true, ...result };
          } catch (err) {
            logger.error({ err, movieFileId, userId: ctx.userId }, "Radarr tool: delete_movie_file failed");
            return { error: err instanceof Error ? err.message : "Failed to delete movie file" };
          }
        },
      }),

      upcoming: tool({
        description: "Get upcoming movie releases (cinema, digital, physical) from the Radarr calendar.",
        inputSchema: z.object({
          days: z.number().min(1).max(90).optional().describe("Days to look ahead (default 30)"),
          filter: filterParam,
        }),
        execute: async ({ days, filter }) => {
          logger.info({ days, filter, userId: ctx.userId }, "Radarr tool: upcoming invoked");
          try {
            const opts = await getRadarrOptions();
            const movies = await getUpcoming(opts, days ?? 30);
            const { items, filtered } = applyFilter(movies, filter);
            await ctx.logActivity({
              type: "radarr_query",
              summary: `Checked upcoming — ${movies.length} movies in next ${days ?? 30} days${filtered ? " (filtered)" : ""}`,
              metadata: { count: movies.length, days: days ?? 30, filtered },
            });
            return { movies: items, totalCount: movies.length, filtered };
          } catch (err) {
            logger.error({ err, userId: ctx.userId }, "Radarr tool: upcoming failed");
            return { error: err instanceof Error ? err.message : "Failed to get upcoming movies" };
          }
        },
      }),

      queue: tool({
        description: "Check the current download queue — what movies are being downloaded or waiting right now.",
        inputSchema: z.object({ filter: filterParam }),
        execute: async ({ filter }) => {
          logger.info({ filter, userId: ctx.userId }, "Radarr tool: queue invoked");
          try {
            const opts = await getRadarrOptions();
            const items = await getQueue(opts);
            if (items.length === 0) return { message: "Download queue is empty — nothing downloading.", items: [] };
            const { items: filtered, filtered: didFilter } = applyFilter(items, filter);
            await ctx.logActivity({
              type: "radarr_query",
              summary: `Checked queue — ${items.length} items${didFilter ? " (filtered)" : ""}`,
              metadata: { count: items.length, filtered: didFilter },
            });
            return { items: filtered, totalCount: items.length, filtered: didFilter };
          } catch (err) {
            logger.error({ err, userId: ctx.userId }, "Radarr tool: queue failed");
            return { error: err instanceof Error ? err.message : "Failed to get queue" };
          }
        },
      }),

      history: tool({
        description: "Get recent download/import history from Radarr.",
        inputSchema: z.object({
          limit: z.number().min(1).max(50).optional().describe("Number of history items (default 20)"),
          filter: filterParam,
        }),
        execute: async ({ limit, filter }) => {
          logger.info({ limit, filter, userId: ctx.userId }, "Radarr tool: history invoked");
          try {
            const opts = await getRadarrOptions();
            const items = await getHistory(opts, limit ?? 20);
            const { items: filtered, filtered: didFilter } = applyFilter(items, filter);
            await ctx.logActivity({
              type: "radarr_query",
              summary: `Checked history — ${items.length} events${didFilter ? " (filtered)" : ""}`,
              metadata: { count: items.length, filtered: didFilter },
            });
            return { items: filtered, totalCount: items.length, filtered: didFilter };
          } catch (err) {
            logger.error({ err, userId: ctx.userId }, "Radarr tool: history failed");
            return { error: err instanceof Error ? err.message : "Failed to get history" };
          }
        },
      }),

      wanted: tool({
        description: "List missing/wanted movies — movies that are monitored but haven't been downloaded yet.",
        inputSchema: z.object({
          limit: z.number().min(1).max(50).optional().describe("Number of wanted movies (default 20)"),
          filter: filterParam,
        }),
        execute: async ({ limit, filter }) => {
          logger.info({ limit, filter, userId: ctx.userId }, "Radarr tool: wanted invoked");
          try {
            const opts = await getRadarrOptions();
            const movies = await getWantedMissing(opts, limit ?? 20);
            const { items, filtered } = applyFilter(movies, filter);
            await ctx.logActivity({
              type: "radarr_query",
              summary: `Checked wanted — ${movies.length} missing movies${filtered ? " (filtered)" : ""}`,
              metadata: { count: movies.length, filtered },
            });
            return { movies: items, totalCount: movies.length, filtered };
          } catch (err) {
            logger.error({ err, userId: ctx.userId }, "Radarr tool: wanted failed");
            return { error: err instanceof Error ? err.message : "Failed to get wanted movies" };
          }
        },
      }),

      search_new: tool({
        description:
          "Search for a movie to potentially add to Radarr. Searches TMDB, not your local library. Returns results with tmdbId needed for adding.",
        inputSchema: z.object({
          term: z.string().describe("Search term — movie title"),
          filter: filterParam,
        }),
        execute: async ({ term, filter }) => {
          logger.info({ term, filter, userId: ctx.userId }, "Radarr tool: search_new invoked");
          try {
            const opts = await getRadarrOptions();
            const results = await searchNewMovies(opts, term);
            const { items, filtered } = applyFilter(results, filter);
            await ctx.logActivity({
              type: "radarr_query",
              summary: `Searched for "${term}" — ${results.length} results${filtered ? " (filtered)" : ""}`,
              metadata: { term, count: results.length, filtered },
            });
            return { results: items, totalCount: results.length, filtered };
          } catch (err) {
            logger.error({ err, term, userId: ctx.userId }, "Radarr tool: search_new failed");
            return { error: err instanceof Error ? err.message : "Failed to search movies" };
          }
        },
      }),

      add_movie: tool({
        description:
          "Add a new movie to Radarr for monitoring and downloading. Use radarr_search_new first to get the tmdbId, and confirm with the user before calling this.",
        inputSchema: z.object({
          tmdbId: z.number().describe("TMDB ID from radarr_search_new results"),
          qualityProfileId: z.number().optional().describe("Quality profile ID (uses default if omitted)"),
          monitored: z.boolean().optional().describe("Whether to monitor the movie (default true)"),
          searchForMovie: z.boolean().optional().describe("Search for the movie immediately (default true)"),
        }),
        execute: async ({ tmdbId, qualityProfileId, monitored, searchForMovie }) => {
          logger.info({ tmdbId, userId: ctx.userId }, "Radarr tool: add_movie invoked");
          try {
            const opts = await getRadarrOptions();
            const added = await addNewMovie(opts, tmdbId, qualityProfileId, monitored ?? true, searchForMovie ?? true);
            await ctx.logActivity({
              type: "radarr_action",
              summary: `Added movie "${added.title}" (tmdbId: ${tmdbId})`,
              metadata: { tmdbId, title: added.title, movieId: added.id },
            });
            return { success: true, ...added };
          } catch (err) {
            logger.error({ err, tmdbId, userId: ctx.userId }, "Radarr tool: add_movie failed");
            return { error: err instanceof Error ? err.message : "Failed to add movie" };
          }
        },
      }),

      search_movie: tool({
        description:
          "Trigger a manual search for a movie on indexers. Searches for a better quality version or re-downloads. Confirm with user before triggering.",
        inputSchema: z.object({
          movieIds: z.array(z.number()).describe("Radarr movie IDs to search (from list_movies or get_movie)"),
        }),
        execute: async ({ movieIds }) => {
          logger.info({ movieIds, userId: ctx.userId }, "Radarr tool: search_movie invoked");
          try {
            const opts = await getRadarrOptions();
            const result = await searchMovie(opts, movieIds);
            await ctx.logActivity({
              type: "radarr_action",
              summary: `Triggered search for ${movieIds.length} movie(s)`,
              metadata: { movieIds },
            });
            return { success: true, ...result };
          } catch (err) {
            logger.error({ err, movieIds, userId: ctx.userId }, "Radarr tool: search_movie failed");
            return { error: err instanceof Error ? err.message : "Failed to trigger movie search" };
          }
        },
      }),
    };
  },

  async checkHealth(ctx) {
    logger.debug({ userId: ctx.userId }, "Radarr: health check");
    const opts = await ctx.getOptions<Partial<RadarrOptions>>();
    if (!opts.base_url || !opts.api_key) {
      return { status: "warning", message: "Not configured" };
    }
    try {
      const status = await getSystemStatus({ base_url: opts.base_url, api_key: opts.api_key });
      return { status: "ok", message: `Connected — Radarr v${status.version ?? "unknown"}` };
    } catch (err) {
      logger.error({ err, userId: ctx.userId }, "Radarr: health check failed");
      return { status: "error", message: err instanceof Error ? err.message : "Connection failed" };
    }
  },
};
