---
title: Usage
status: in-progress
owner: self
last_updated: 2026-03-14
canonical_file: docs/requirements/usage.md
---

# Usage

## Purpose

- Problem: Give authenticated users a quick way to review chat token consumption, estimated spend, and model usage patterns over time.
- Outcome: Users can open `/usage`, filter their own tracked chat completions by date range and model, and understand cost and token trends without leaving Aether.
- Notes: This document reflects the current implementation of the usage page and its backing chat usage aggregation.

## Current Reality

- Current behavior: `/usage` is an authenticated analytics page for chat usage events, with preset and custom date filters, optional model filtering, summary cards, daily charts, model breakdown, recent event rows, and an empty state when no data exists.
- Constraints: Data only exists for completed assistant responses that created `ChatUsageEvent` rows; stats are scoped to the signed-in user; the page reads directly from aggregated event history rather than recomputing from message transcripts.
- Non-goals: Org-wide reporting, export/download, per-message transcript drill-down, budget alerts, non-chat product analytics, and manual event correction are not implemented.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Access control | done | Only authenticated users can load the usage page and only their own usage events are queried. |
| Filtering | done | Users can filter usage by preset range, custom from/to dates, and model. |
| Summary metrics | done | The page shows aggregated cost, token, and activity totals for the selected view. |
| Trend visualization | done | The page visualizes daily cost, daily token flow, and model cost mix for the filtered events. |
| Event inspection | done | The page lists recent tracked exchanges with model, thread, token, cost, and timestamp data. |
| Analytics depth | in-progress | Usage reporting is useful for high-level monitoring, but deeper drill-down, export, and budgeting workflows are not yet defined. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Usage route gating | done | `/usage` redirects anonymous users to `/login` before stats load. | Inline |
| Search normalization | done | Invalid or missing search params normalize to a safe default view. | Inline |
| Summary cards | done | The page shows estimated cost, total tokens, token split, and average cost. | Inline |
| Daily charts | done | Cost and token usage are grouped by day for the selected range. | Inline |
| Model breakdown | done | A pie chart and legend show cost share by model in the current result set. | Inline |
| Recent exchanges table | done | The latest 10 matching events are listed with thread and model context. | Inline |
| Empty state | done | Users without matching events see a clear empty state and a CTA back to chat. | Inline |

## Detail

### Access control and user scoping

- Requirement: The usage page must require authentication and must only show analytics derived from the active user's chat usage events.
- Notes: `/usage` checks `getSession()` in `beforeLoad`; `getChatUsageStats()` calls `ensureSession()` and filters `chatUsageEvent` rows by `userId`; thread title lookups are also scoped to the same user.
- Dependencies: `src/routes/usage.tsx`, `src/lib/chat-usage.functions.ts`, `src/lib/auth.functions.ts`.
- Follow-up: Align route protection style with other protected pages if you want one shared server-first pattern everywhere.

### Search params and filter behavior

- Requirement: The page must support preset date ranges, custom `from` and `to` dates, and an optional model filter that all update the current route state.
- Notes: Missing or invalid search params normalize to `preset: 30d` and `model: all`; when only a preset is active, the page derives default dates; if `from` is after `to`, the values are swapped into ascending order.
- Dependencies: `src/routes/usage.tsx`, `src/lib/chat-usage.ts`.
- Follow-up: Decide whether the page should expose an explicit reset action instead of relying on preset and field changes.

### Aggregated metrics

- Requirement: The filtered view must compute totals for input tokens, output tokens, total tokens, estimated cost, event count, average cost per event, average tokens per event, and active days.
- Notes: Aggregation is derived from matching `ChatUsageEvent` rows; events represent completed assistant responses, not partial streams; currency formatting preserves very small non-zero values as `<$0.0001`.
- Dependencies: `src/lib/chat-usage.functions.ts`, `src/lib/chat-usage.ts`, `src/routes/api/chat.ts`.
- Follow-up: Decide whether users should also see cumulative lifetime totals even when a narrow filter is selected.

### Daily usage charts

- Requirement: The page must visualize cost and token activity per day across the selected date window.
- Notes: Daily buckets are created only for dates that have events; cost is shown as an area chart and input/output tokens are shown as stacked bars; tooltips use the full stored day label.
- Dependencies: `src/routes/usage.tsx`, `src/lib/chat-usage.functions.ts`.
- Follow-up: Decide whether zero-event days should be backfilled so trends show continuous timelines.

### Model breakdown

- Requirement: The page must show how estimated cost is distributed across models in the filtered result set.
- Notes: Model rows are sorted by descending estimated cost and include share-of-cost percentages; available model filter options are derived from the filtered result set rather than all configured chat models.
- Dependencies: `src/lib/chat-usage.functions.ts`, `src/lib/chat-usage.ts`, `src/routes/usage.tsx`.
- Follow-up: Decide whether the model filter should always show all supported models, including ones with zero usage in the selected range.

### Recent exchange list

- Requirement: The page must show a recent-events table for the latest matching tracked exchanges.
- Notes: The table is limited to the 10 newest matching events; rows show the usage timestamp, model label, thread title, total tokens, and estimated cost; deleted or missing threads display as `Deleted thread` and events without a thread display `-`.
- Dependencies: `src/lib/chat-usage.functions.ts`, `src/routes/usage.tsx`.
- Follow-up: Decide whether rows should link back to the related chat thread or specific message context.

### Empty-state behavior

- Requirement: When the selected filters return no events, the page must explain the absence of data and offer a clear path back to chat.
- Notes: The empty state appears both for brand-new users and for filtered views with no matches; the CTA links directly to `/chat`.
- Dependencies: `src/routes/usage.tsx`.
- Follow-up: Decide whether the empty state should distinguish between "no usage yet" and "no results for this filter".

## Open Questions

- Should the usage page remain chat-only, or do you want it to become the broader analytics home for future Aether features?
- Should recent events link into the related thread, or is a high-level audit view enough?
- Do you want export, budget thresholds, or longer-term reporting called out as planned sub-features now, or left out of scope?
- Should the model picker list all supported models even when the current filter range has no events for some of them?

## Change Log

- 2026-03-14: Created the initial usage requirements doc from the current `/usage` implementation and added it to the requirements index.
