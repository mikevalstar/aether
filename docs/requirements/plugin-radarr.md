---
title: Plugin — Radarr
status: todo
owner: Mike
last_updated: 2026-04-04
canonical_file: docs/requirements/plugin-radarr.md
---

# Plugin — Radarr

## Purpose

- Problem: No way to check on movie downloads, upcoming releases, or manage the Radarr library without opening the Radarr web UI separately.
- Outcome: A Radarr plugin that gives the AI chat full read access to the movie library — movies, calendar, queue, history, and wanted list — plus the ability to trigger searches, add movies, and delete/re-download files. No dashboard widget or dedicated pages; AI-only integration with plugin settings.
- Notes: Phase 2 of the *arr stack integration (after Sonarr). Shares the same `tsarr` dependency. Plugin ID is `radarr`.

## Current Reality

- Current behavior: Sonarr plugin exists for TV shows. No movie management integration.
- Constraints: Radarr runs as a separate service with its own API. Requires API key and base URL. All access via REST API.
- Non-goals: Dashboard widgets, dedicated pages/routes, Radarr webhook receiver, quality profile editing, indexer configuration.

## Dependency

- **`tsarr`** (npm, already installed) — TypeScript SDK covering the *arr stack. Uses the Radarr client.
- Movie file deletion uses direct `fetch` (not yet in tsarr's high-level `RadarrClient`).

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Plugin skeleton | todo | `src/plugins/radarr/` following the dual-export pattern |
| Configuration | todo | API key + base URL settings with test connection |
| AI tools | todo | 10 tools for querying and managing movies, calendar, queue, history, wanted |
| System prompt | todo | AI instructions for when and how to use Radarr tools |
| Health check | todo | Validate API key and connectivity via Radarr system/status endpoint |

## Sub-features

| Sub-feature | Status | Summary |
| --- | --- | --- |
| Plugin meta & options | todo | Plugin ID `radarr`, config fields for API key and URL |
| Radarr client wrapper | todo | Thin wrapper around `tsarr` RadarrClient with typed helpers |
| `radarr_list_movies` tool | todo | List all movies with status, file info, JMESPath filter |
| `radarr_get_movie` tool | todo | Get detailed movie info by title or ID, includes movieFile info |
| `radarr_upcoming` tool | todo | Calendar of upcoming releases (cinema/digital/physical), JMESPath filter |
| `radarr_queue` tool | todo | Current download queue with progress, JMESPath filter |
| `radarr_history` tool | todo | Recent download/import history, JMESPath filter |
| `radarr_wanted` tool | todo | Missing/wanted movies not yet downloaded, JMESPath filter |
| `radarr_search_new` tool | todo | Search TMDB for new movies to add, JMESPath filter |
| `radarr_add_movie` tool | todo | Add a movie by tmdbId |
| `radarr_delete_movie_file` tool | todo | Delete a movie file from disk |
| `radarr_search_movie` tool | todo | Trigger indexer search for specific movies |
| System prompt | todo | Prompt snippet describing tools and usage |
| Health check | todo | Connection + auth validation via system status |
| Test connection | todo | Settings page test button |
| Command palette entry | todo | "Radarr Settings" command |

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
  client.tsx          # AetherPluginClient (commands only)
  lib/
    radarr-client.ts  # tsarr wrapper with typed helpers
```

## Open Questions

None — follows established patterns from Sonarr plugin.

## Future

- Dashboard widget showing combined *arr queue/upcoming (when 2+ *arr plugins exist)
- Webhook receiver for Radarr events
- Cross-plugin "media" tools spanning Sonarr + Radarr

## Change Log

- 2026-04-04: Initial requirements. 10 AI tools with JMESPath filtering, settings, health check.
