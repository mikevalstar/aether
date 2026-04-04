---
title: Plugin — Sonarr
status: todo
owner: Mike
last_updated: 2026-04-04
canonical_file: docs/requirements/plugin-sonarr.md
---

# Plugin — Sonarr

## Purpose

- Problem: No way to check on TV show downloads, upcoming episodes, or manage the Sonarr library without opening the Sonarr web UI separately.
- Outcome: A Sonarr plugin that gives the AI chat full read access to the Sonarr library — series, episodes, calendar, queue, history, and wanted list — plus the ability to trigger searches and manage series. No dashboard widget or dedicated pages; AI-only integration with plugin settings.
- Notes: Phase 1 of a broader *arr stack integration. Future phases will add Radarr, Lidarr, Readarr, and Prowlarr as sibling plugins sharing the same `tsarr` dependency. Plugin ID uses `sonarr` (not `arr_sonarr`) to keep tool names short; sibling plugins will use `radarr`, `lidarr`, etc.

## Current Reality

- Current behavior: No media management integration exists.
- Constraints: Sonarr runs as a separate service (local or remote) with its own API. Requires API key and base URL. All access is via REST API — no webhooks or push from Sonarr into Aether in this phase.
- Non-goals: Dashboard widgets, dedicated pages/routes, Sonarr webhook receiver, direct torrent/NZB client management, quality profile editing, indexer configuration.

## Dependency

- **`tsarr`** (npm) — TypeScript SDK covering the full *arr stack (Sonarr, Radarr, Lidarr, Readarr, Prowlarr, Bazarr). Actively maintained, MIT licensed, ships full TypeScript types. Use the Sonarr client from this package.
- If `tsarr` proves problematic, the Sonarr API v3 is well-documented REST — a thin `fetch` wrapper is a viable fallback.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Plugin skeleton | todo | `src/plugins/sonarr/` following the dual-export pattern |
| Configuration | todo | API key + base URL settings with test connection |
| AI tools | todo | Tools for querying and managing series, episodes, calendar, queue, history, wanted |
| System prompt | todo | AI instructions for when and how to use Sonarr tools |
| Health check | todo | Validate API key and connectivity via Sonarr system/status endpoint |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Plugin meta & options | todo | Plugin ID `sonarr`, config fields for API key and URL | Inline |
| Sonarr client wrapper | todo | Thin wrapper around `tsarr` Sonarr client initialized from plugin options | Inline |
| `sonarr_list_series` tool | todo | List all monitored series with status summary | Inline |
| `sonarr_get_series` tool | todo | Get detailed info for a specific series by name or ID | Inline |
| `sonarr_upcoming` tool | todo | Calendar of upcoming episodes in a date range | Inline |
| `sonarr_queue` tool | todo | Current download queue with progress | Inline |
| `sonarr_history` tool | todo | Recent download/import history | Inline |
| `sonarr_wanted` tool | todo | Missing/wanted episodes (cutoff unmet or not downloaded) | Inline |
| `sonarr_search_new` tool | todo | Search for new series to potentially add | Inline |
| `sonarr_add_series` tool | todo | Add a new series to Sonarr | Inline |
| `sonarr_search_episodes` tool | todo | Trigger a manual search for specific episodes or a full series | Inline |
| System prompt | todo | Prompt snippet describing available tools and usage guidance | Inline |
| Health check | todo | Connection + auth validation via system status endpoint | Inline |
| Test connection | todo | Settings page test button using system status endpoint | Inline |
| Command palette entry | todo | "Sonarr Settings" command linking to plugin settings | Inline |

## Detail

### Plugin Meta & Options

- Plugin ID: `sonarr`
- Name: "Sonarr"
- Description: "TV show download management via Sonarr"
- Icon: `Tv` (lucide-react)
- Version: `0.1.0`
- `hasHealthCheck: true`
- Activity types: `sonarr_query` (read operations), `sonarr_action` (mutating operations like add/search)

Configuration fields:

| Field | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| Base URL | text | `http://localhost:8989` | yes | Sonarr instance URL (include port) |
| API Key | password | — | yes | Sonarr API key (Settings → General in Sonarr UI) |

### Sonarr Client Wrapper

- Located at `src/plugins/sonarr/lib/sonarr-client.ts`
- Initializes `tsarr` Sonarr client from plugin options (URL + API key)
- Exports typed helper functions that the AI tools call
- Handles connection errors gracefully — return structured error messages, don't throw unhandled

### AI Tools

All tools prefixed with `sonarr_` (plugin ID prefix). Tools are designed to give the AI comprehensive read access plus controlled write actions.

#### `sonarr_list_series`

- Description: List all series in Sonarr with their monitoring status, episode counts, and quality
- Parameters: none
- Returns: Array of series summaries — `title`, `year`, `status` (continuing/ended), `monitored`, `episodeFileCount`, `episodeCount`, `percentComplete`, `sizeOnDisk`, `qualityProfileName`
- Logs activity: `sonarr_query`
- Notes: Returns all series. For large libraries (100+), consider adding a `filter` param in a future iteration.

#### `sonarr_get_series`

- Description: Get detailed information about a specific series including seasons and episode breakdown
- Parameters: `query` (required, string) — series title (fuzzy matched) or Sonarr series ID (number)
- Returns: Full series detail — title, year, overview, status, network, genres, runtime, ratings, seasons with episode counts per season, next airing, path on disk
- Logs activity: `sonarr_query`
- Notes: If `query` is a string, search the local library by title. If multiple matches, return all matches with a note to the AI to ask the user to clarify.

#### `sonarr_upcoming`

- Description: Get upcoming episodes (airing soon) from the Sonarr calendar
- Parameters: `days` (optional, number, default 7, max 30) — number of days to look ahead
- Returns: Array of upcoming episodes — `seriesTitle`, `seasonNumber`, `episodeNumber`, `title`, `airDateUtc`, `overview`, `hasFile` (already downloaded or not)
- Logs activity: `sonarr_query`

#### `sonarr_queue`

- Description: Check the current download queue — what's being downloaded right now
- Parameters: none
- Returns: Array of queue items — `seriesTitle`, `episodeTitle`, `seasonNumber`, `episodeNumber`, `quality`, `status` (downloading/queued/paused/warning/failed), `progress` (percentage), `estimatedCompletionTime`, `downloadClient`
- Logs activity: `sonarr_query`
- Notes: If queue is empty, return a clear "nothing in queue" message.

#### `sonarr_history`

- Description: Get recent download/import history from Sonarr
- Parameters: `limit` (optional, number, default 20, max 50)
- Returns: Array of history events — `seriesTitle`, `episodeTitle`, `seasonNumber`, `episodeNumber`, `quality`, `eventType` (grabbed/downloadFolderImported/downloadFailed/etc.), `date`
- Logs activity: `sonarr_query`

#### `sonarr_wanted`

- Description: List missing or wanted episodes that haven't been downloaded yet
- Parameters: `limit` (optional, number, default 20, max 50)
- Returns: Array of wanted episodes — `seriesTitle`, `seasonNumber`, `episodeNumber`, `title`, `airDateUtc`, `monitored`
- Logs activity: `sonarr_query`
- Notes: Uses Sonarr's "wanted/missing" endpoint. Only includes episodes that have aired but aren't downloaded.

#### `sonarr_search_new`

- Description: Search for a TV series to potentially add to Sonarr (searches online databases, not local library)
- Parameters: `term` (required, string)
- Returns: Array of search results — `title`, `year`, `overview`, `tvdbId`, `imdbId`, `network`, `status`, `seasonCount`, `alreadyInLibrary` (boolean)
- Logs activity: `sonarr_query`
- Notes: Uses Sonarr's series lookup endpoint. The `alreadyInLibrary` flag tells the AI whether the series is already tracked.

#### `sonarr_add_series`

- Description: Add a new series to Sonarr for monitoring and downloading
- Parameters: `tvdbId` (required, number — from `sonarr_search_new` results), `qualityProfileId` (optional, number — use default if omitted), `monitored` (optional, boolean, default true), `searchForMissingEpisodes` (optional, boolean, default true)
- Returns: Confirmation with series title, path, and monitoring status
- Logs activity: `sonarr_action`
- Notes: Uses Sonarr's root folder and default quality profile if not specified. The AI should always use `sonarr_search_new` first to get the `tvdbId` and confirm with the user before adding.

#### `sonarr_search_episodes`

- Description: Trigger a manual search for specific episodes or all missing episodes of a series
- Parameters: `seriesId` (required, number), `seasonNumber` (optional, number — omit to search all missing), `episodeIds` (optional, array of numbers — specific episodes)
- Returns: Confirmation that search was triggered, with count of episodes being searched
- Logs activity: `sonarr_action`
- Notes: This triggers Sonarr's indexer search — results appear in the queue. The AI should confirm with the user before triggering searches, especially for full series.

### System Prompt

```
You have access to Sonarr tools for managing TV show downloads. Use these tools when the user asks about TV shows, episodes, downloads, or their media library:

- `sonarr_list_series`: List all tracked TV series with status
- `sonarr_get_series`: Get detailed info about a specific series
- `sonarr_upcoming`: Check what episodes are airing soon
- `sonarr_queue`: See what's currently downloading
- `sonarr_history`: View recent download history
- `sonarr_wanted`: List missing episodes that need downloading
- `sonarr_search_new`: Search for new TV series to add
- `sonarr_add_series`: Add a new series (always search first and confirm with user)
- `sonarr_search_episodes`: Trigger a download search for specific episodes

For adding series: always use `sonarr_search_new` first to find the tvdbId, then confirm with the user before calling `sonarr_add_series`.
For episode searches: confirm with the user before triggering `sonarr_search_episodes` as it will actively search indexers.
```

### Health Check

- Calls Sonarr's `GET /api/v3/system/status` endpoint
- Returns:
  - `ok`: Connected, shows Sonarr version
  - `warning`: Not configured (missing URL or API key)
  - `error`: Connection failed or auth rejected (401)

### Test Connection

- Uses the same system/status endpoint as health check
- Called from settings page with current (unsaved) form values
- Returns `{ success, message }` — success true if status endpoint responds with 200

### Command Palette

- Registers "Sonarr Settings" command linking to `/settings/plugins/sonarr`
- Uses `Tv` icon from lucide-react

## File Structure

```
src/plugins/sonarr/
  index.ts            # Client-safe AetherPlugin export (no server imports)
  index.server.ts     # Full AetherPlugin export (includes server definition)
  meta.ts             # PluginMeta, optionFields, activityTypes
  server.ts           # AetherPluginServer (tools, systemPrompt, health)
  client.tsx          # AetherPluginClient (commands only — no widgets)
  lib/
    sonarr-client.ts  # tsarr wrapper with typed helpers
```

## Open Questions

- **Quality profile selection on add**: Should `sonarr_add_series` accept a quality profile name (user-friendly) or ID? Could add a `sonarr_list_profiles` tool to let the AI discover available profiles, but that adds complexity. Starting with "use default" and an optional ID override.
- **Root folder selection on add**: Sonarr can have multiple root folders. Same question — default to the first/primary root folder and add a tool for listing root folders later if needed.

## Future Phases

- **Phase 2 — Radarr**: Same pattern, `src/plugins/radarr/`, `tsarr` Radarr client. Movies instead of series.
- **Phase 3 — Lidarr/Readarr**: Music and books. Lower priority.
- **Phase 4 — Prowlarr**: Indexer management. Likely useful as a shared service that other *arr plugins reference.
- **Cross-plugin features**: Unified "media" AI tools that span multiple *arr services (e.g., "what's downloading?" checks all queues).
- **Dashboard widget**: Media overview widget showing combined queue/upcoming across all *arr services (add when there are 2+ *arr plugins).
- **Webhook receiver**: Accept Sonarr webhook events (download complete, health issue) to trigger AI workflows or notifications.

## Change Log

- 2026-04-04: Initial requirements drafted. Phase 1 scoped to Sonarr only with 9 AI tools, settings, health check, no dashboard/pages.
