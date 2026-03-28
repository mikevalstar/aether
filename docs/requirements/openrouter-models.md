---
title: OpenRouter Model Browser
status: todo
owner: self
last_updated: 2026-03-28
canonical_file: docs/requirements/openrouter-models.md
---

# OpenRouter Model Browser

## Purpose

- Problem: The only way to add OpenRouter models is by hardcoding them in `chat-models.ts`. Users cannot discover, compare, or enable new models without a code change.
- Outcome: Users can browse the full OpenRouter model catalog from `/settings/chat`, see pricing, and enable models for use in chat. Enabled models appear alongside the hardcoded Anthropic and OpenRouter models in all model selectors.
- Notes: Only OpenRouter models are browsable. The three hardcoded Anthropic models and any hardcoded OpenRouter models remain as built-in defaults that cannot be removed.

## Current Reality

- Current behavior: `CHAT_MODELS` in `src/lib/chat-models.ts` is a static `as const` array with 3 Anthropic + 3 OpenRouter models. The chat settings page (`/settings/chat`) only has a default model selector dropdown.
- Constraints: The `ChatModel` type is derived from the static array, so user-added models will need a different type path. OpenRouter is already wired up via `@openrouter/ai-sdk-provider` in `ai-tools.ts`. The OpenRouter API at `GET https://openrouter.ai/api/v1/models` is public (no auth required) and returns all models with embedded pricing.
- Non-goals: Adding non-OpenRouter providers (e.g. OpenAI direct, Google direct). Editing or overriding built-in model configs. Per-model tool configuration by the user.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Model catalog fetch | todo | The server fetches and caches the OpenRouter model list from `GET https://openrouter.ai/api/v1/models`. |
| Model browser UI | todo | Users can search, filter, and browse available OpenRouter models on the `/settings/chat` page. |
| Pricing display | todo | Each model in the browser shows input and output cost per million tokens. |
| Enable/disable models | todo | Users can enable models from the catalog, making them available in chat model selectors, and disable previously enabled models. |
| Enabled models in chat | todo | User-enabled OpenRouter models appear alongside built-in models in all model selection UIs (chat settings default, empty state, chat header). |
| Persistence | todo | Enabled model selections and their metadata are persisted so they survive server restarts and page reloads. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| OpenRouter API caching | todo | Fetch model list server-side with a time-based cache to avoid hitting the API on every page load. | [Detail](#openrouter-api-caching) |
| Model browser section | todo | New section on `/settings/chat` below existing settings with search input and model list. | [Detail](#model-browser-section) |
| Model card / row | todo | Each model displays name, provider org, context length, and per-million-token pricing (input + output). | [Detail](#model-card--row) |
| Enable toggle | todo | Each browsable model has an enable/disable action that persists the selection. | [Detail](#enable-toggle) |
| Enabled models list | todo | A separate section on `/settings/chat` showing currently enabled custom models with the ability to remove them. | [Detail](#enabled-models-list) |
| Model resolution at runtime | todo | Chat API and model selectors merge built-in models with user-enabled models at runtime. | [Detail](#model-resolution-at-runtime) |
| Pricing in model selector | todo | When selecting a model in the chat UI, show the per-million-token pricing alongside the model name. | [Detail](#pricing-in-model-selector) |

## Detail

### OpenRouter API caching

- Requirement: The server must fetch the OpenRouter model catalog and cache it to avoid redundant API calls.
- Notes: `GET https://openrouter.ai/api/v1/models` returns ~350 models with no pagination. Response includes `id`, `name`, `description`, `context_length`, `pricing` (per-token costs as strings), `architecture`, `top_provider`, and `supported_parameters`. Cache should have a reasonable TTL (e.g. 1 hour). The endpoint is public and requires no auth. Consider a server function that returns the cached list to the client.
- Dependencies: New server function (e.g. `src/lib/openrouter.functions.ts`).
- Follow-up: Decide whether to filter the catalog (e.g. only models that support `tools` in `supported_parameters`) or show everything.

### Model browser section

- Requirement: A new section on `/settings/chat` where users can search and browse the OpenRouter model catalog.
- Notes: Should include a search input that filters by model name or ID. The list may be long (~350 models), so consider virtualized rendering or pagination. Search should be client-side against the cached list. Group or sort by provider org (the part before `/` in the model ID) could help discoverability. The section should be clearly separated from the existing "default model" setting and the "enabled models" list.
- Dependencies: `src/routes/settings/chat.tsx`, OpenRouter API cache.

### Model card / row

- Requirement: Each model in the browser must display its name, provider, context window, and pricing.
- Notes: The OpenRouter API pricing is per-token in USD as strings. Convert to per-million-token for display consistency with existing `CHAT_MODELS` pricing. Key fields to show: model name (`name`), model ID (`id`), context length (`context_length`), input cost (`pricing.prompt` * 1,000,000), output cost (`pricing.completion` * 1,000,000). Optional: modality (`architecture.modality`), max output tokens (`top_provider.max_completion_tokens`).
- Dependencies: OpenRouter API response shape.

### Enable toggle

- Requirement: Users can enable an OpenRouter model from the browser, which adds it to their available model set.
- Notes: Enabling a model should store the model ID and a snapshot of its metadata (name, pricing, context length) so the model is usable even if the catalog cache is stale. This avoids a hard dependency on the catalog being available at chat time. A model that is already a built-in (appears in `CHAT_MODELS`) should not be shown as "enableable" or should be visually marked as already available.
- Dependencies: User preferences storage.

### Enabled models list

- Requirement: The settings page shows a list of user-enabled custom models with the ability to remove them.
- Notes: Show above the browser section so users can quickly see and manage their selections. Each entry shows model name, pricing, and a remove button. Removing a model that is currently set as the default chat model should either warn the user or reset the default.
- Dependencies: `src/routes/settings/chat.tsx`, preferences.

### Model resolution at runtime

- Requirement: All model selection UIs and the chat API must recognize user-enabled models alongside built-in models.
- Notes: Currently `CHAT_MODELS` is a static array and `ChatModel` is a string literal union derived from it. This needs to become dynamic. Approach: keep `CHAT_MODELS` as the built-in set, and create a function (e.g. `getAllChatModels()`) that merges built-ins with the user's enabled models from preferences. User-enabled OpenRouter models should use `provider: "openrouter"`, `webToolVersion: "none"`, `supportsEffort: false`, `supportsCodeExecution: false`. The `isChatModel()` guard and `ChatModel` type will need to accept arbitrary strings for user-added models. The chat API validation must also accept user-enabled model IDs.
- Dependencies: `src/lib/chat-models.ts`, `src/routes/api/chat.ts`, `src/lib/ai-tools.ts`, `src/lib/preferences.ts`.
- Follow-up: Decide how to handle the `ChatModel` type — either widen it to `string` with runtime validation, or keep the literal union for built-ins and use a separate type for custom models.

### Pricing in model selector

- Requirement: Model selection dropdowns in the chat UI should display pricing information alongside the model name.
- Notes: Show input/output cost per million tokens in a compact format, e.g. "$3 / $15" or "$3 in / $15 out". This helps users make cost-conscious decisions when switching models mid-conversation. Applies to: the default model selector in `/settings/chat`, the model picker in the chat empty state, and the model picker in the chat header.
- Dependencies: `src/routes/settings/chat.tsx`, `src/components/chat/ChatEmptyState.tsx`, `src/components/chat/ChatHeader.tsx`.

## Persistence

User-enabled models are stored in the `UserPreferences` JSON column as a new field:

```typescript
enabledOpenRouterModels?: Array<{
  id: string           // e.g. "google/gemini-2.5-pro"
  name: string         // e.g. "Google: Gemini 2.5 Pro"
  contextLength: number
  pricing: {
    inputCostPerMillionTokensUsd: number
    outputCostPerMillionTokensUsd: number
  }
}>
```

Storing metadata alongside the ID means the model is usable for display and cost estimation even without a fresh catalog fetch.

## Open Questions

- Should the browser filter to only models that support `tools` in `supported_parameters`, or show all models and indicate which support tool use?
- Should there be a limit on how many models a user can enable, or is the list unbounded?
- Should the catalog cache be shared across users (server-level singleton) or fetched per-user?
- When the OpenRouter catalog updates pricing for an already-enabled model, should the stored snapshot be refreshed automatically or only on user action?
- Should the model browser show additional metadata like modality (text-only vs multimodal) or max output tokens?

## Change Log

- 2026-03-28: Created initial requirements for OpenRouter model browser feature.
