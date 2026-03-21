---
title: Plugin — API Balances
status: todo
owner: Mike
last_updated: 2026-03-21
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
| Plugin skeleton | todo | `src/plugins/api_balances/` following `imap_email` file structure (meta, server, client, index) |
| Service integrations | todo | OpenRouter, OpenAI, Kilo Code — each independently configurable and toggleable |
| Config & settings | todo | Per-service API key fields with individual test buttons; per-service enable/disable toggles |
| Dashboard widget | todo | Single widget showing balance/credit status for all enabled services |
| AI tool | todo | `api_balances_get_balances` tool returning structured balance data for all enabled services |
| Caching | todo | In-memory cache with 10-minute TTL per service, refreshed on request |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Plugin meta & options schema | todo | Plugin ID, option fields for each service's credentials + enable toggles | Inline |
| OpenRouter integration | todo | `GET /api/v1/credits` — management API key, returns total_credits & total_usage | Inline |
| OpenAI integration | todo | `GET /v1/dashboard/billing/credit_grants` — API key, returns credit grant balance | Inline |
| Kilo Code integration | todo | `GET /kilo/profile` or undocumented balance endpoint — API key, returns balance if available | Inline |
| Balance cache layer | todo | In-memory cache keyed by `{userId}:{service}`, 10-min TTL, lazy refresh | Inline |
| Dashboard widget | todo | Half-width widget showing per-service balance rows with status indicators | Inline |
| AI tool | todo | Single tool returning all enabled service balances as structured data | Inline |
| Health check | todo | Test each enabled service's connection/auth independently | Inline |

## Detail

### Plugin Meta & Options Schema

- Plugin ID: `api_balances`
- Icon: `Wallet` (lucide-react)
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
- Response: `{ total_credits, total_usage }` → balance = `total_credits - total_usage`
- Best integration — straightforward and documented.

### OpenAI Integration

- Primary endpoint: `GET https://api.openai.com/v1/dashboard/billing/credit_grants`
- Auth: `Authorization: Bearer <api_key>`
- Response includes grant amounts and usage — compute remaining from grants.
- Note: This is a legacy dashboard API endpoint that may be deprecated. If it stops working, fall back to showing "unavailable" rather than erroring.

### Kilo Code Integration

- Try: `GET https://api.kilo.ai/kilo/profile` with `Authorization: Bearer <api_key>`
- Fallback: balance may be embedded in the profile response object.
- This is undocumented — mark as experimental in the UI. If the endpoint returns usable balance data, display it; otherwise show "Balance unavailable" gracefully.

### Balance Cache Layer

- In-memory `Map` keyed by `{userId}:{serviceId}`.
- Each entry stores: `{ balance, fetchedAt, error? }`.
- On request, return cached value if `fetchedAt` is within 10 minutes; otherwise fetch fresh.
- Cache is per-process (resets on server restart) — no persistence needed.
- Failed fetches cache the error for 10 minutes too (avoid hammering a down service).

### Dashboard Widget

- Size: `"half"` (one column)
- Header: "API Balances" with Wallet icon
- Body: one row per enabled service showing:
  - Service name/icon
  - Balance amount (formatted as currency, e.g., "$12.34")
  - Status indicator: green dot (fetched OK), yellow (cached/stale), red (error)
  - "Last checked: 3m ago" relative timestamp
- States:
  - **No services configured**: "No services configured" with link to plugin settings
  - **Error**: Show service name + error message inline (don't hide the whole widget)
  - **Loading**: Skeleton rows matching expected service count

### AI Tool

- Tool name: `api_balances_get_balances`
- Description: "Get current credit balances for configured AI services"
- No parameters (returns all enabled services)
- Returns array of: `{ service, balance, currency, lastChecked, error? }`
- System prompt: "You have access to the api_balances_get_balances tool. Use it when the user asks about their API credits, balance, or remaining funds on AI platforms."

### Health Check

- Iterates over enabled services, attempts a balance fetch for each.
- Returns `ok` if all enabled services respond, `warning` if some fail, `error` if all fail.
- Message summarizes: e.g., "OpenRouter: $12.34 | OpenAI: error"

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
