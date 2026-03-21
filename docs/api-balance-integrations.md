# API Balance & Usage Integrations

Research into programmatic balance/usage checking for AI platforms used in this project. Intended for building a usage/balance dashboard widget in Aether.

Last updated: 2026-03-21

## OpenRouter

**Status: Best integration available**

`GET https://openrouter.ai/api/v1/credits` returns `total_credits` and `total_usage` directly, so remaining balance is trivially computable.

- Auth: Requires a **management API key** (not a regular provisioned key)
- Docs: Documented in OpenRouter API reference

## Anthropic (Claude Platform)

**Status: Usage/cost data official, balance endpoint undocumented**

### Official (Admin API key required: `sk-ant-admin...`)

- `GET /v1/organizations/usage_report/messages` — token consumption over a date range, groupable by model/workspace/API key
- `GET /v1/organizations/cost_report` — USD cost breakdowns by workspace/description

These give historical usage and cost data but there is no official endpoint for remaining prepaid credits or balance.

### Undocumented balance endpoint (may break without notice)

Discovered via GitHub issue [anthropics/anthropic-sdk-python#505](https://github.com/anthropics/anthropic-sdk-python/issues/505):

```
GET https://console.anthropic.com/api/organizations/{ORGANIZATION_ID}/prepaid/credits
```

Returns `{"amount": 456}` where amount is in **cents** (so 456 = $4.56). The organization ID can be found at `https://console.anthropic.com/settings/organization`.

**Auth: Browser session cookie only** — API keys do not work. Would need to extract a session token from the browser to use programmatically, similar to the Kilo situation.

## OpenAI Platform

**Status: Workable but fragmented**

- `GET /v1/organization/usage/{category}` — usage by product category
- `GET /v1/dashboard/billing/subscription` — subscription info (legacy dashboard API)
- `GET /v1/dashboard/billing/credit_grants` — closest thing to a balance check

Getting a full picture requires combining multiple endpoints. The `credit_grants` endpoint is the most useful for balance tracking — it returns `total_granted`, `total_used`, and `total_available`. However, the dashboard billing endpoints are legacy and OpenAI has removed API key auth for them; they now require a browser session token (`sess-...`), making programmatic access unreliable.

## Exa AI

**Status: Usage data only, no balance endpoint. Confirmed 2026-03-21.**

- `GET https://admin-api.exa.ai/team-management/api-keys/{id}/usage` — `total_cost_usd` + per-service cost breakdown (neural search, content retrieval, etc.) over a date range
  - Query params: `start_date`, `end_date`, `group_by` (hour/day/month)
  - Max 100-day lookback window; defaults to 30 days
- Individual API responses include `CostDollars` for per-request cost tracking

Auth requires a **service key** (admin credential) via `x-api-key` header, not a regular API key. Returns spend data but not a "remaining balance" figure.

The Team Management API has 6 endpoints (CRUD for API keys + usage) — none return balance or credits. The main Search API (`api.exa.ai`) has no account/billing endpoints. Credits are managed entirely through the Exa dashboard UI (`dashboard.exa.ai`).

No balance/credits endpoint exists, documented or otherwise. Exa uses a credits-based pricing model ($10 free credits to start, then plan-based monthly allotments) but does not expose remaining credits via API.

## Kilo Code

**Status: Undocumented endpoint works with API key auth**

There is no documented billing/balance API. The only documented programmatic signal is an HTTP 402 error when credits are exhausted, which includes `cost_microdollars` in chat completion responses for per-request cost tracking.

### Working endpoint (undocumented, may break without notice)

`GET https://app.kilo.ai/api/profile/balance` with `Authorization: Bearer <API_KEY>` returns:

```json
{"balance": 12.94, "isDepleted": false}
```

- Auth: Standard Kilo API key (the same JWT used for chat completions) works as a Bearer token.
- The gateway routes at `api.kilo.ai/kilo/*` return 404 — they are not deployed on the production gateway.
- Tested 2026-03-21.

### CLI

The `kilo stats` CLI command shows per-session token usage and cost statistics, but this is local session data, not account balance. There is no `kilo balance` or `kilo credits` CLI command.
