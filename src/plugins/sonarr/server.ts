import { tool } from "ai";
import { z } from "zod";
import { logger } from "#/lib/logger";
import type { AetherPluginServer } from "../types";
import {
  addNewSeries,
  findSeriesByTitle,
  getHistory,
  getQueue,
  getSeriesById,
  getSystemStatus,
  getUpcoming,
  getWantedMissing,
  listSeries,
  type SonarrOptions,
  searchEpisodes,
  searchNewSeries,
} from "./lib/sonarr-client";

export const sonarrServer: AetherPluginServer = {
  systemPrompt: `You have access to Sonarr tools for managing TV show downloads. Use these tools when the user asks about TV shows, episodes, downloads, or their media library:
- sonarr_list_series: List all tracked TV series with status
- sonarr_get_series: Get detailed info about a specific series (by name or ID)
- sonarr_upcoming: Check what episodes are airing soon
- sonarr_queue: See what's currently downloading
- sonarr_history: View recent download history
- sonarr_wanted: List missing episodes that need downloading
- sonarr_search_new: Search for new TV series to add
- sonarr_add_series: Add a new series (always search first and confirm with user)
- sonarr_search_episodes: Trigger a download search for specific episodes

For adding series: always use sonarr_search_new first to find the tvdbId, then confirm with the user before calling sonarr_add_series.
For episode searches: confirm with the user before triggering sonarr_search_episodes as it will actively search indexers.`,

  createTools(ctx) {
    async function getSonarrOptions(): Promise<SonarrOptions> {
      const opts = await ctx.getOptions<Partial<SonarrOptions>>();
      if (!opts.base_url || !opts.api_key) {
        throw new Error(
          "Sonarr plugin is not configured. Please set up the URL and API key in Settings > Plugins > Sonarr.",
        );
      }
      return { base_url: opts.base_url, api_key: opts.api_key };
    }

    return {
      list_series: tool({
        description: "List all TV series in Sonarr with their monitoring status, episode counts, and completion percentage.",
        inputSchema: z.object({}),
        execute: async () => {
          logger.info({ userId: ctx.userId }, "Sonarr tool: list_series invoked");
          try {
            const opts = await getSonarrOptions();
            const series = await listSeries(opts);
            await ctx.logActivity({
              type: "sonarr_query",
              summary: `Listed ${series.length} series`,
              metadata: { count: series.length },
            });
            return { series, count: series.length };
          } catch (err) {
            logger.error({ err, userId: ctx.userId }, "Sonarr tool: list_series failed");
            return { error: err instanceof Error ? err.message : "Failed to list series" };
          }
        },
      }),

      get_series: tool({
        description:
          "Get detailed information about a specific TV series including seasons, episode breakdown, and next airing. Search by title or Sonarr series ID.",
        inputSchema: z.object({
          query: z.string().describe("Series title (fuzzy match) or numeric Sonarr series ID"),
        }),
        execute: async ({ query }) => {
          logger.info({ query, userId: ctx.userId }, "Sonarr tool: get_series invoked");
          try {
            const opts = await getSonarrOptions();
            const id = Number(query);
            if (!Number.isNaN(id) && String(id) === query.trim()) {
              const series = await getSeriesById(opts, id);
              return series;
            }
            const matches = await findSeriesByTitle(opts, query);
            if (matches.length === 0) return { error: `No series found matching "${query}"` };
            if (matches.length === 1 && matches[0].id != null) {
              const series = await getSeriesById(opts, matches[0].id);
              return series;
            }
            return {
              message: `Multiple matches found for "${query}". Please clarify:`,
              matches: matches.map((s) => ({ id: s.id, title: s.title, year: s.year })),
            };
          } catch (err) {
            logger.error({ err, query, userId: ctx.userId }, "Sonarr tool: get_series failed");
            return { error: err instanceof Error ? err.message : "Failed to get series" };
          }
        },
      }),

      upcoming: tool({
        description: "Get upcoming episodes airing soon from the Sonarr calendar.",
        inputSchema: z.object({
          days: z.number().min(1).max(30).optional().describe("Days to look ahead (default 7)"),
        }),
        execute: async ({ days }) => {
          logger.info({ days, userId: ctx.userId }, "Sonarr tool: upcoming invoked");
          try {
            const opts = await getSonarrOptions();
            const episodes = await getUpcoming(opts, days ?? 7);
            await ctx.logActivity({
              type: "sonarr_query",
              summary: `Checked upcoming — ${episodes.length} episodes in next ${days ?? 7} days`,
              metadata: { count: episodes.length, days: days ?? 7 },
            });
            return { episodes, count: episodes.length };
          } catch (err) {
            logger.error({ err, userId: ctx.userId }, "Sonarr tool: upcoming failed");
            return { error: err instanceof Error ? err.message : "Failed to get upcoming episodes" };
          }
        },
      }),

      queue: tool({
        description: "Check the current download queue — what's being downloaded or waiting to download right now.",
        inputSchema: z.object({}),
        execute: async () => {
          logger.info({ userId: ctx.userId }, "Sonarr tool: queue invoked");
          try {
            const opts = await getSonarrOptions();
            const items = await getQueue(opts);
            await ctx.logActivity({
              type: "sonarr_query",
              summary: `Checked queue — ${items.length} items`,
              metadata: { count: items.length },
            });
            if (items.length === 0) return { message: "Download queue is empty — nothing downloading.", items: [] };
            return { items, count: items.length };
          } catch (err) {
            logger.error({ err, userId: ctx.userId }, "Sonarr tool: queue failed");
            return { error: err instanceof Error ? err.message : "Failed to get queue" };
          }
        },
      }),

      history: tool({
        description: "Get recent download/import history from Sonarr.",
        inputSchema: z.object({
          limit: z.number().min(1).max(50).optional().describe("Number of history items (default 20)"),
        }),
        execute: async ({ limit }) => {
          logger.info({ limit, userId: ctx.userId }, "Sonarr tool: history invoked");
          try {
            const opts = await getSonarrOptions();
            const items = await getHistory(opts, limit ?? 20);
            await ctx.logActivity({
              type: "sonarr_query",
              summary: `Checked history — ${items.length} events`,
              metadata: { count: items.length },
            });
            return { items, count: items.length };
          } catch (err) {
            logger.error({ err, userId: ctx.userId }, "Sonarr tool: history failed");
            return { error: err instanceof Error ? err.message : "Failed to get history" };
          }
        },
      }),

      wanted: tool({
        description: "List missing/wanted episodes — episodes that have aired but haven't been downloaded yet.",
        inputSchema: z.object({
          limit: z.number().min(1).max(50).optional().describe("Number of wanted episodes (default 20)"),
        }),
        execute: async ({ limit }) => {
          logger.info({ limit, userId: ctx.userId }, "Sonarr tool: wanted invoked");
          try {
            const opts = await getSonarrOptions();
            const episodes = await getWantedMissing(opts, limit ?? 20);
            await ctx.logActivity({
              type: "sonarr_query",
              summary: `Checked wanted — ${episodes.length} missing episodes`,
              metadata: { count: episodes.length },
            });
            return { episodes, count: episodes.length };
          } catch (err) {
            logger.error({ err, userId: ctx.userId }, "Sonarr tool: wanted failed");
            return { error: err instanceof Error ? err.message : "Failed to get wanted episodes" };
          }
        },
      }),

      search_new: tool({
        description:
          "Search for a TV series to potentially add to Sonarr. Searches online databases (TVDB), not your local library. Returns results with tvdbId needed for adding.",
        inputSchema: z.object({
          term: z.string().describe("Search term — TV show title"),
        }),
        execute: async ({ term }) => {
          logger.info({ term, userId: ctx.userId }, "Sonarr tool: search_new invoked");
          try {
            const opts = await getSonarrOptions();
            const results = await searchNewSeries(opts, term);
            await ctx.logActivity({
              type: "sonarr_query",
              summary: `Searched for "${term}" — ${results.length} results`,
              metadata: { term, count: results.length },
            });
            return { results, count: results.length };
          } catch (err) {
            logger.error({ err, term, userId: ctx.userId }, "Sonarr tool: search_new failed");
            return { error: err instanceof Error ? err.message : "Failed to search series" };
          }
        },
      }),

      add_series: tool({
        description:
          "Add a new TV series to Sonarr for monitoring and downloading. Use sonarr_search_new first to get the tvdbId, and confirm with the user before calling this.",
        inputSchema: z.object({
          tvdbId: z.number().describe("TVDB ID from sonarr_search_new results"),
          qualityProfileId: z.number().optional().describe("Quality profile ID (uses default if omitted)"),
          monitored: z.boolean().optional().describe("Whether to monitor the series (default true)"),
          searchForMissingEpisodes: z
            .boolean()
            .optional()
            .describe("Search for existing episodes immediately (default true)"),
        }),
        execute: async ({ tvdbId, qualityProfileId, monitored, searchForMissingEpisodes }) => {
          logger.info({ tvdbId, userId: ctx.userId }, "Sonarr tool: add_series invoked");
          try {
            const opts = await getSonarrOptions();
            const added = await addNewSeries(
              opts,
              tvdbId,
              qualityProfileId,
              monitored ?? true,
              searchForMissingEpisodes ?? true,
            );
            await ctx.logActivity({
              type: "sonarr_action",
              summary: `Added series "${added.title}" (tvdbId: ${tvdbId})`,
              metadata: { tvdbId, title: added.title, seriesId: added.id },
            });
            return { success: true, ...added };
          } catch (err) {
            logger.error({ err, tvdbId, userId: ctx.userId }, "Sonarr tool: add_series failed");
            return { error: err instanceof Error ? err.message : "Failed to add series" };
          }
        },
      }),

      search_episodes: tool({
        description:
          "Trigger a manual search for episodes on indexers. Can search all missing episodes for a series, or a specific season. Confirm with user before triggering.",
        inputSchema: z.object({
          seriesId: z.number().describe("Sonarr series ID (from list_series or get_series)"),
          seasonNumber: z.number().optional().describe("Season number — omit to search all missing episodes"),
        }),
        execute: async ({ seriesId, seasonNumber }) => {
          logger.info({ seriesId, seasonNumber, userId: ctx.userId }, "Sonarr tool: search_episodes invoked");
          try {
            const opts = await getSonarrOptions();
            const result = await searchEpisodes(opts, seriesId, seasonNumber);
            await ctx.logActivity({
              type: "sonarr_action",
              summary: `Triggered ${result.type} search for series ${seriesId}${seasonNumber != null ? ` season ${seasonNumber}` : ""}`,
              metadata: { seriesId, seasonNumber, type: result.type },
            });
            return { success: true, ...result };
          } catch (err) {
            logger.error({ err, seriesId, seasonNumber, userId: ctx.userId }, "Sonarr tool: search_episodes failed");
            return { error: err instanceof Error ? err.message : "Failed to trigger episode search" };
          }
        },
      }),
    };
  },

  async checkHealth(ctx) {
    logger.debug({ userId: ctx.userId }, "Sonarr: health check");
    const opts = await ctx.getOptions<Partial<SonarrOptions>>();
    if (!opts.base_url || !opts.api_key) {
      return { status: "warning", message: "Not configured" };
    }
    try {
      const status = await getSystemStatus({ base_url: opts.base_url, api_key: opts.api_key });
      return { status: "ok", message: `Connected — Sonarr v${status.version ?? "unknown"}` };
    } catch (err) {
      logger.error({ err, userId: ctx.userId }, "Sonarr: health check failed");
      return { status: "error", message: err instanceof Error ? err.message : "Connection failed" };
    }
  },
};
