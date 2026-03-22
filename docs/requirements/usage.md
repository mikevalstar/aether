---
title: Usage
status: in-progress
owner: self
last_updated: 2026-03-22
canonical_file: docs/requirements/usage.md
---

# Usage

## Purpose

- Problem: Give authenticated users a quick way to review chat token consumption, estimated spend, and model usage patterns over time.
- Outcome: Users can open `/usage`, filter their own tracked chat completions by date range, model, and task type, and understand cost and token trends without leaving Aether.
- Notes: This document reflects the current implementation of the usage page and its backing chat usage aggregation.

## Current Reality

- Current behavior: `/usage` is an authenticated analytics page for chat usage events, with a unified date range picker (presets and custom calendar), optional model and task type filtering, summary cards, daily charts (cost stacked by model and token flow), model breakdown, recent event rows with thread links, and an empty state when no data exists.
- Constraints: Data only exists for completed assistant responses that created `ChatUsageEvent` rows; stats are scoped to the signed-in user; the page reads directly from aggregated event history rather than recomputing from message transcripts.
- Non-goals: Org-wide reporting, export/download, per-message transcript drill-down, budget alerts, non-chat product analytics, and manual event correction are not implemented.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Access control | done | Only authenticated users can load the usage page and only their own usage events are queried. |
| Filtering | done | Users can filter usage by preset date range or custom calendar selection, model, and task type. |
| Summary metrics | done | The page shows aggregated cost, token, and activity totals for the selected view. |
| Trend visualization | done | The page visualizes daily cost stacked by model, daily token flow, and model cost mix for the filtered events. |
| Event inspection | done | The page lists recent tracked exchanges with model, task type, thread link, token, cost, and timestamp data. |
| Analytics depth | in-progress | Usage reporting is useful for high-level monitoring, but deeper drill-down, export, and budgeting workflows are not yet defined. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Usage route gating | done | `/usage` redirects anonymous users to `/login` before stats load. | Inline |
| Search normalization | done | Invalid or missing search params normalize to a safe default view. | Inline |
| Date range picker | done | A unified date range picker provides preset ranges and a two-month calendar for custom date selection. | Inline |
| Task type filter | done | Users can filter events by task type (e.g. chat, title generation). | Inline |
| Summary cards | done | The page shows estimated cost, total tokens, token split, and average cost. | Inline |
| Daily cost chart | done | Cost is visualized as a stacked area chart broken down by model for the selected range. | Inline |
| Daily token chart | done | Input and output tokens are shown as stacked bars by day. | Inline |
| Model breakdown | done | A pie chart and legend show cost share by model in the current result set. | Inline |
| Recent exchanges table | done | The latest 10 matching events are listed with thread links, task type badges, and model context. | Inline |
| Thread linking | done | Recent exchange rows link directly to the related chat thread. | Inline |
| Empty state | done | Users without matching events see a clear empty state and a CTA back to chat. | Inline |

## Detail

### Access control and user scoping

- Requirement: The usage page must require authentication and must only show analytics derived from the active user's chat usage events.
- Notes: `/usage` checks `getSession()` in `beforeLoad`; `getChatUsageStats()` calls `ensureSession()` and filters `chatUsageEvent` rows by `userId`; thread title lookups are also scoped to the same user.
- Dependencies: `src/routes/usage.tsx`, `src/lib/chat-usage.functions.ts`, `src/lib/auth.functions.ts`.
- Follow-up: Align route protection style with other protected pages if you want one shared server-first pattern everywhere.

### Search params and filter behavior

- Requirement: The page must support preset date ranges via a unified date range picker, custom calendar-based date selection, an optional model filter, and an optional task type filter that all update the current route state.
- Notes: The `DateRangePicker` component provides built-in presets (Last week, Last 7 days, This month, Last month, Last 30 days, Last 90 days, All time) alongside a two-month calendar for custom selection. When no dates are provided, the picker defaults to the `30d` preset. If `from` is after `to`, the values are swapped into ascending order. Model defaults to `all` and task type defaults to `all`. Search params are `from`, `to`, `model`, and `taskType`.
- Dependencies: `src/routes/usage.tsx`, `src/lib/chat-usage.ts`, `src/components/ui/date-range-picker.tsx`.
- Follow-up: Decide whether the page should expose an explicit reset action instead of relying on preset and field changes.

### Task type filter

- Requirement: The page must allow filtering usage events by task type.
- Notes: Task types are defined in `src/lib/chat-usage.ts` as `chat` and `title`. The `ChatUsageEvent` model stores a `taskType` field (default `"chat"`). Title generation events are recorded when the system auto-generates thread titles. The filter dropdown shows human-readable labels (e.g. "Chat", "Title generation").
- Dependencies: `src/routes/usage.tsx`, `src/lib/chat-usage.ts`, `prisma/schema.prisma`.
- Follow-up: Add new task types as additional AI features are introduced (e.g. summarization, compaction).

### Aggregated metrics

- Requirement: The filtered view must compute totals for input tokens, output tokens, total tokens, estimated cost, event count, average cost per event, average tokens per event, and active days.
- Notes: Aggregation is derived from matching `ChatUsageEvent` rows; events represent completed assistant responses, not partial streams; currency formatting preserves very small non-zero values as `<$0.0001`.
- Dependencies: `src/lib/chat-usage.functions.ts`, `src/lib/chat-usage.ts`, `src/routes/api/chat.ts`.
- Follow-up: Decide whether users should also see cumulative lifetime totals even when a narrow filter is selected.

### Daily usage charts

- Requirement: The page must visualize cost and token activity per day across the selected date window.
- Notes: The cost chart is a stacked area chart broken down by model, with a legend identifying each model's color. Daily token flow is shown as stacked bars for input and output tokens. Daily buckets are created only for dates that have events; zero-event days within the range are not backfilled. Tooltips use the full stored day label.
- Dependencies: `src/routes/usage.tsx`, `src/lib/chat-usage.functions.ts`.
- Follow-up: Decide whether zero-event days should be backfilled so trends show continuous timelines.

### Model breakdown

- Requirement: The page must show how estimated cost is distributed across models in the filtered result set.
- Notes: Model rows are sorted by descending estimated cost and include share-of-cost percentages; available model filter options are derived from the filtered result set rather than all configured chat models.
- Dependencies: `src/lib/chat-usage.functions.ts`, `src/lib/chat-usage.ts`, `src/routes/usage.tsx`.
- Follow-up: Decide whether the model filter should always show all supported models, including ones with zero usage in the selected range.

### Recent exchange list

- Requirement: The page must show a recent-events table for the latest matching tracked exchanges.
- Notes: The table is limited to the 10 newest matching events; rows show the usage timestamp, model label, task type badge, thread title, total tokens, and estimated cost; deleted or missing threads display as `Deleted thread` and events without a thread display no thread line. Rows with a valid thread link directly to the related chat thread via `<Link to="/chat" search={{ threadId }}>`.
- Dependencies: `src/lib/chat-usage.functions.ts`, `src/routes/usage.tsx`.

### Thread linking in recent exchanges

- Requirement: Recent exchange rows must link to the related chat thread when the thread still exists.
- Notes: Each event row checks for a valid `threadId`; if present and the thread exists, the thread title is rendered as a `<Link>` to `/chat?threadId=...`; deleted threads show as plain text ("Deleted thread"); events without a thread show no thread line.
- Dependencies: `src/routes/usage.tsx`, `src/lib/chat-usage.functions.ts`.

### Empty-state behavior

- Requirement: When the selected filters return no events, the page must explain the absence of data and offer a clear path back to chat.
- Notes: The empty state appears both for brand-new users and for filtered views with no matches; the CTA links directly to `/chat`.
- Dependencies: `src/routes/usage.tsx`.
- Follow-up: Decide whether the empty state should distinguish between "no usage yet" and "no results for this filter".

## Open Questions

- Should the usage page remain chat-only, or do you want it to become the broader analytics home for future Aether features?
- Do you want export, budget thresholds, or longer-term reporting called out as planned sub-features now, or left out of scope?
- Should the model picker list all supported models even when the current filter range has no events for some of them?

## Change Log

- 2026-03-14: Created the initial usage requirements doc from the current `/usage` implementation and added it to the requirements index.
- 2026-03-22: Updated to reflect task type filter, unified DateRangePicker with presets and calendar, stacked-by-model cost chart, thread linking in recent exchanges, and task type badges on event rows.
