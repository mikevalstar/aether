---
title: Plugin — API Balances
status: done
owner: Mike
last_updated: 2026-03-22
canonical_file: docs/requirements/plugin-api-balances.md
---

# Plugin — API Balances

## Purpose

- Problem: No visibility into remaining credits/balance across the AI services used by this project without logging into each provider's dashboard.
- Outcome: A single dashboard widget showing balance/credit status for configured services, plus an AI tool so the chat can report balances on demand.
- Notes: Follows the plugin pattern established by `imap_email`. Research in `docs/api-balance-integrations.md`.

## Current Reality

- Current behavior: No balance tracking exists. Users must check each provider's web dashboard manually.
- Constraints: Each provider has different auth requirements and endpoint shapes. Some services (Anthropic, Exa) lack balance endpoints entirely — excluded from initial scope.
- Non-goals: Usage analytics/history (the existing `/usage` page covers chat usage). Billing management or top-up actions.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Plugin skeleton | done | `src/plugins/api_balances/` following `imap_email` file structure (meta, server, client, index) |
| Service integrations | done | OpenRouter, OpenAI, Kilo Code — each independently configurable and toggleable |
| Config & settings | done | Per-service API key fields with individual test buttons; per-service enable/disable toggles |
| Dashboard widget | done | Single widget showing balance/credit status for all enabled services |
| AI tool | done | `api_balances_get_balances` tool returning structured balance data for all enabled services |
| Caching | done | In-memory cache with 10-minute TTL per service, refreshed on request |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Plugin meta & options schema | done | Plugin ID, option fields for each service's credentials + enable toggles | Inline |
| OpenRouter integration | done | `GET /api/v1/credits` — management API key, returns total_credits & total_usage | Inline |
| OpenAI integration | done | `GET /v1/dashboard/billing/credit_grants` — API key, returns credit grant balance | Inline |
| Kilo Code integration | done | `GET /api/profile/balance` — API key, returns balance | Inline |
| Balance cache layer | done | In-memory cache keyed by `{userId}:{service}`, 10-min TTL, lazy refresh | Inline |
| Dashboard widget | done | Quarter-width widget showing per-service balance rows with status indicators | Inline |
| AI tool | done | Single tool returning all enabled service balances as structured data | Inline |
| Health check | done | Test each enabled service's connection/auth independently | Inline |
| Test connection | done | Dedicated test function for per-service connection testing from settings UI | Inline |
| Command palette entry | done | "API Balances Settings" command linking to plugin settings page | Inline |

## Detail

### Plugin Meta & Options Schema

- Plugin ID: `api_balances`
- Icon: `Wallet` (lucide-react)
- Version: `0.1.0`
- Activity types: `balance_check` — logged when balances are checked via AI tool
- Option fields per service follow a pattern: `{service}_enabled` (boolean), `{service}_api_key` (password), plus any service-specific fields
- Services in scope:

| Service | Option fields | Auth notes |
| --- | --- | --- |
| OpenRouter | `openrouter_enabled`, `openrouter_api_key` | Requires **management** API key (not provisioned key) |
| OpenAI | `openai_enabled`, `openai_api_key` | Standard API key; uses legacy dashboard billing endpoints |
| Kilo Code | `kilo_enabled`, `kilo_api_key` | API key; endpoint is undocumented and may break |

### OpenRouter Integration

- Endpoint: `GET https://openrouter.ai/api/v1/credits`
- Auth: `Authorization: Bearer <management_api_key>`
- Response: `{ data: { total_credits, total_usage } }` → balance = `total_credits - total_usage`
- Best integration — straightforward and documented.

### OpenAI Integration

- Primary endpoint: `GET https://api.openai.com/v1/dashboard/billing/credit_grants`
- Auth: `Authorization: Bearer <api_key>`
- Response includes `total_available` field — used directly as the balance amount.
- Note: This is a legacy dashboard API endpoint that may be deprecated. If it stops working, fall back to showing "unavailable" rather than erroring.

### Kilo Code Integration

- Endpoint: `GET https://app.kilo.ai/api/profile/balance` with `Authorization: Bearer <api_key>`
- Response: `{ balance: <number>, isDepleted: <bool> }`
- This is undocumented — mark as experimental in the UI. If the endpoint returns usable balance data, display it; otherwise show "Balance unavailable" gracefully.

### Balance Cache Layer

- In-memory `Map` keyed by `{userId}:{serviceId}`.
- Each entry stores: `{ result: BalanceResult, fetchedAt: timestamp }`.
- On request, return cached value if `fetchedAt` is within 10 minutes; otherwise fetch fresh.
- Cache is per-process (resets on server restart) — no persistence needed.
- Failed fetches cache the error for 10 minutes too (avoid hammering a down service).
- `clearCache(userId)` function clears all entries for a user (used by health check to force fresh data).

### Dashboard Widget

- Size: `"quarter"` (one quarter width)
- Header: "API Balances" with Wallet icon
- Body: one row per enabled service showing:
  - Service name
  - Balance amount (formatted as currency, e.g., "$12.34")
  - Status indicator: green `CheckCircle2` (fetched OK), red `AlertCircle` (error)
  - Relative timestamp via `date-fns` `formatDistanceToNow` (e.g., "3 minutes ago")
- States:
  - **No services configured**: "No services configured" with directions to plugin settings
  - **Error**: Show service name + error message inline (don't hide the whole widget)
  - **No balances**: "No balances to display" fallback

### AI Tool

- Tool name: `api_balances_get_balances` (plugin prefix `api_balances_` + tool name `get_balances`)
- Description: "Get current credit balances for configured AI services. Returns balance amounts, currency, and last-checked timestamps."
- No parameters (returns all enabled services)
- Returns `{ balances: BalanceResult[] }` where each entry has: `service, serviceName, balance, currency, lastChecked, error?`
- Logs a `balance_check` activity event with the list of services checked
- System prompt: "You have access to the api_balances_get_balances tool. Use it when the user asks about their API credits, balance, or remaining funds on AI platforms like OpenRouter, OpenAI, or Kilo Code."

### Health Check

- Clears the cache for the user first to ensure fresh data.
- Iterates over enabled services, attempts a balance fetch for each.
- Returns `ok` if all enabled services respond, `warning` if some fail or no services are enabled, `error` if all fail.
- Message summarizes: e.g., "OpenRouter: $12.34 | OpenAI: error"

### Test Connection

- Separate `testApiBalancesConnection` function in `lib/test-connection.ts` used by plugin settings UI test buttons.
- Tests all enabled services with configured API keys in parallel.
- Returns `{ success, message }` — success is true only if all enabled services respond without error.
- Called from `plugins.functions.ts` when the user clicks a test button in plugin settings.

### Command Palette

- Registers an "API Balances Settings" command in the command palette (`Cmd+K`) linking to `/settings/plugins/api_balances`.

## File Structure

```
src/plugins/api_balances/
  index.ts            # Combined AetherPlugin export (client-safe)
  index.server.ts     # Full plugin with server capabilities
  meta.ts             # PluginMeta, optionFields, activityTypes
  server.ts           # AI tool, widget loader, health check, cache
  client.tsx          # BalancesWidget component
  lib/
    balance-cache.ts  # In-memory cache with TTL logic
    openrouter.ts     # OpenRouter API client
    openai.ts         # OpenAI billing API client
    kilo.ts           # Kilo Code API client (experimental)
    test-connection.ts # Per-service connection testing for settings UI
    types.ts          # Shared types (BalanceResult, ServiceConfig, etc.)
```

## Open Questions

- **OpenAI endpoint stability**: The `credit_grants` endpoint is legacy. If it gets removed, should we drop OpenAI support or try to find a replacement?

## Resolved Questions

- ~~**Kilo Code auth**: Need to test whether the API key works with the gateway endpoint or if it requires session cookie auth.~~ Resolved: The gateway routes (`api.kilo.ai/kilo/*`) return 404. The web app endpoint `app.kilo.ai/api/profile/balance` works with the standard API key as Bearer auth. Returns `{"balance": <number>, "isDepleted": <bool>}`.

## Future Services

These were researched (2026-03-21) but excluded — no balance endpoint exists for either:

- **Anthropic**: Has usage/cost admin API endpoints but no balance endpoint. An undocumented console endpoint (`console.anthropic.com/api/organizations/{ORG_ID}/prepaid/credits`) exists but requires browser session cookie auth — API keys don't work. Feature request (anthropics/anthropic-sdk-python#505) was closed as "not planned."
- **Exa AI**: Has usage data via admin API (`admin-api.exa.ai/team-management/api-keys/{id}/usage`) but no remaining credits endpoint. Credits managed entirely through the Exa dashboard UI. No documented or undocumented balance endpoint found.

Both could be added later if they ship official balance endpoints, or via a "manual starting balance minus tracked spend" approximation approach.

## Change Log

- 2026-03-21: Initial requirements drafted
- 2026-03-21: Resolved Kilo Code endpoint (app.kilo.ai works with API key). Confirmed Anthropic and Exa have no balance endpoints.
- 2026-03-21: Marked all requirements and sub-features as done. Plugin skeleton, all three service integrations (OpenRouter, OpenAI, Kilo), dashboard widget, AI tool, caching, and health checks all implemented.
- 2026-03-22: Updated doc to match implementation — corrected widget size (quarter, not half), OpenRouter response shape (nested under `data`), Kilo endpoint (app.kilo.ai/api/profile/balance), OpenAI balance field (`total_available`), status indicators (CheckCircle2/AlertCircle icons, no yellow/stale state). Added missing file `test-connection.ts`, command palette entry, activity type details, and test connection sub-feature.
