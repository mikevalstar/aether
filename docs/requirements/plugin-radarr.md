---
title: Plugin — Radarr
status: done
owner: Mike
last_updated: 2026-04-07
canonical_file: docs/requirements/plugin-radarr.md
---

# Plugin — Radarr

## Purpose

- Problem: No way to check on movie downloads, upcoming releases, or manage the Radarr library without opening the Radarr web UI separately.
- Outcome: A Radarr plugin that gives the AI chat full read access to the movie library — movies, calendar, queue, history, and wanted list — plus the ability to trigger searches, add movies, and delete/re-download files. Phase 2 adds dashboard widgets for upcoming and recent movies.
- Notes: Phase 2 of the *arr stack integration (after Sonarr). Shares the same `tsarr` dependency. Plugin ID is `radarr`.

## Current Reality

- Current behavior: Sonarr plugin exists for TV shows. No movie management integration.
- Constraints: Radarr runs as a separate service with its own API. Requires API key and base URL. All access via REST API.
- Non-goals (Phase 1): Dedicated pages/routes, Radarr webhook receiver, quality profile editing, indexer configuration. (Dashboard widgets added in Phase 2.)

## Dependency

- **`tsarr`** (npm, already installed) — TypeScript SDK covering the *arr stack. Uses the Radarr client.
- Movie file deletion uses direct `fetch` (not yet in tsarr's high-level `RadarrClient`).

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Plugin skeleton | done | `src/plugins/radarr/` following the dual-export pattern |
| Configuration | done | API key + base URL settings with test connection |
| AI tools | done | 10 tools for querying and managing movies, calendar, queue, history, wanted |
| System prompt | done | AI instructions for when and how to use Radarr tools |
| Health check | done | Validate API key and connectivity via Radarr system/status endpoint |
| Dashboard widgets | done | Phase 2 — Upcoming (next 30 days) and Recent (last 10 history events) widgets |

## Sub-features

| Sub-feature | Status | Summary |
| --- | --- | --- |
| Plugin meta & options | done | Plugin ID `radarr`, config fields for API key and URL |
| Radarr client wrapper | done | Thin wrapper around `tsarr` RadarrClient with typed helpers |
| `radarr_list_movies` tool | done | List all movies with status, file info, JMESPath filter |
| `radarr_get_movie` tool | done | Get detailed movie info by title or ID, includes movieFile info |
| `radarr_upcoming` tool | done | Calendar of upcoming releases (cinema/digital/physical), JMESPath filter |
| `radarr_queue` tool | done | Current download queue with progress, JMESPath filter |
| `radarr_history` tool | done | Recent download/import history, JMESPath filter |
| `radarr_wanted` tool | done | Missing/wanted movies not yet downloaded, JMESPath filter |
| `radarr_search_new` tool | done | Search TMDB for new movies to add, JMESPath filter |
| `radarr_add_movie` tool | done | Add a movie by tmdbId |
| `radarr_delete_movie_file` tool | done | Delete a movie file from disk |
| `radarr_search_movie` tool | done | Trigger indexer search for specific movies |
| System prompt | done | Prompt snippet describing tools and usage |
| Health check | done | Connection + auth validation via system status |
| Test connection | done | Settings page test button |
| Command palette entry | done | "Radarr Settings" command |

## Detail

### Plugin Meta & Options

- Plugin ID: `radarr`
- Name: "Radarr"
- Icon: `Film` (lucide-react)
- Version: `0.1.0`
- `hasHealthCheck: true`
- Activity types: `radarr_query` (read), `radarr_action` (mutating)

Configuration fields:

| Field | Type | Default | Required |
| --- | --- | --- | --- |
| Base URL | text | `http://localhost:7878` | yes |
| API Key | password | — | yes |

### AI Tools

10 tools, all prefixed with `radarr_`. List tools support JMESPath `filter` parameter.

Key differences from Sonarr:
- No episodes — movies are single entities. `get_movie` returns `movieFile` info directly.
- `search_new` searches TMDB (not TVDB). Returns `tmdbId`.
- `add_movie` takes `tmdbId` (not tvdbId).
- `upcoming` defaults to 30 days (movies release less frequently than TV).
- `search_movie` takes an array of `movieIds` (not series/season/episode).
- Delete workflow: `get_movie` → `delete_movie_file` → `search_movie`.

### File Structure

```
src/plugins/radarr/
  index.ts            # Client-safe AetherPlugin export
  index.server.ts     # Full AetherPlugin export with server
  meta.ts             # PluginMeta, optionFields, activityTypes
  server.ts           # AetherPluginServer (tools, systemPrompt, health)
  client.tsx          # AetherPluginClient (commands + dashboard widgets)
  lib/
    radarr-client.ts  # tsarr wrapper with typed helpers
```

## Open Questions

None — follows established patterns from Sonarr plugin.

## Phase 2 — Dashboard Widgets

Two half-width widgets contributed via `AetherPluginClient.widgets`:

- **Radarr — Upcoming**: Next 30 days from `getCalendar()`. Shows movie title, year, and the soonest of cinema/digital/physical release dates. Limited to 10 entries.
- **Radarr — Recent**: Last 10 history events from `getHistory()`. Shows movie title, event type, and relative timestamp.

Data is loaded server-side via `loadWidgetData(ctx)` in `server.ts` — returns `{ configured, upcoming, recent, error? }`. Both widgets read from the same per-plugin `data` object and gracefully render "not configured" / error states.

## Future

- Combined cross-plugin "media" widget spanning Sonarr + Radarr queues/upcoming
- Webhook receiver for Radarr events
- Cross-plugin "media" tools spanning Sonarr + Radarr

## Change Log

- 2026-04-04: Initial requirements. 10 AI tools with JMESPath filtering, settings, health check.
- 2026-04-06: Marked complete — all requirements fully implemented.
- 2026-04-07: Phase 2 — added two dashboard widgets (Radarr — Upcoming, Radarr — Recent) backed by `loadWidgetData()` in `server.ts`.
