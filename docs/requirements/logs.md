---
title: Logs Viewer
status: done
owner: self
last_updated: 2026-03-17
canonical_file: docs/requirements/logs.md
---

# Logs Viewer

## Purpose

- Problem: Runtime logs are written to local rotated files in `./logs`, but there is no in-app way to inspect them, filter them, or search for errors.
- Outcome: A top-level Logs page that lists available log days, lets the user pick a single day, and then searches structured Pino entries with level filters and pagination.
- Notes: The viewer is intentionally day-scoped so we never need to load the entire log history into memory just to inspect one incident.

## Current Reality

- Current behavior: Pino writes newline-delimited JSON to daily rotated files like `aether.2026-03-17.1.log` in `./logs`.
- Constraints: Logs are local filesystem data, not database records. Some days may contain multiple rotated files. Search needs to stay memory-safe enough for normal day-sized logs.
- Non-goals: Cross-day search, log deletion/retention controls, real-time tailing, or external log shipping.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Nav integration | done | Add a top-level `Logs` destination in the main header nav for authenticated users. |
| Day selection | done | The logs UI must require scoping to a single available day before searching/filtering entries. |
| File discovery | done | The server must discover rotated log files in `./logs`, group them by day, and merge all files for a selected day. |
| Structured parsing | done | Log files must be parsed as newline-delimited JSON using a log-friendly parser library rather than raw string splitting alone. |
| Filtering | done | The viewer must support free-text search across structured content plus level filtering (`trace` through `fatal`). |
| Pagination | done | The page must return paginated results so large single-day logs remain workable in the UI. |
| Raw inspection | done | Each result row must allow expanding the full structured JSON payload for deeper debugging. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Route | done | `/logs` authenticated route with loader-backed search params: `day`, `query`, `level`, `page`. | Inline |
| Day picker | done | Select populated from available log dates derived from rotated filenames. | Inline |
| Parser | done | `ndjson` parses newline-delimited Pino output into structured objects on the server. | Inline |
| Search | done | Free-text search matches across message text, errors, and remaining JSON payload fields. | Inline |
| Level counts | done | UI shows quick counts for matched `trace/debug/info/warn/error/fatal` entries. | Inline |
| Result table | done | Rows show time, level badge, source file/line, message, context chips, and expandable JSON. | Inline |
| Empty states | done | Handle both “no log files yet” and “no matches for current filters”. | Inline |

## Detail

### Data source

- Read log files from `LOG_DIR` when set, otherwise default to `./logs`.
- Match rotated files using the current naming pattern `aether.YYYY-MM-DD.N.log`.
- If a day has multiple rotated files, parse them in numeric sequence and treat them as one logical day.

### Server behavior

- Gate all log access behind `ensureSession()`.
- Stream and parse the selected day via `ndjson` so we can scan entries without loading every file in the history.
- Apply level filtering and free-text filtering server-side.
- Return only one page of normalized entries at a time, plus counts and available days.

### UI behavior

- Default to the newest available day when the URL does not specify one.
- Keep filters in the URL so a specific log search can be refreshed or bookmarked.
- Show structured metadata chips inline for quick scanning.
- Provide a disclosure section per row for the full JSON payload.

## Resolved Decisions

- **Scope**: Single-day only for now.
- **Parser library**: Use `ndjson` for newline-delimited JSON parsing.
- **Pagination size**: 100 entries per page.
- **Search location**: Server-side, not client-side, so the browser only receives the selected page.

## Open Questions

- None at this time.

## Change Log

- 2026-03-17: Implemented `/logs` route, server-side day discovery, `ndjson` parsing, filters, pagination, and nav integration.
