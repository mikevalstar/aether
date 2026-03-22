# Research: IM-Based Interface for Aether

**Date:** 2026-03-22
**Status:** Exploration / Research

## Goal

Explore adding an IM (instant messaging) interface to Aether so the AI assistant can be accessed from existing chat apps (Telegram, Discord, Slack, etc.) rather than only through the web UI.

### Key Challenges Identified

1. **No thread concept** — IM conversations are continuous streams, unlike our web chat which has discrete threads. Need a strategy for session boundaries, context windowing, or implicit thread detection.
2. **Compaction** — Long-running IM conversations will hit token limits. Requires server-side compaction (already planned — see `project_chat_compaction.md` memory).
3. **Integration complexity** — Need to connect to an external messaging platform reliably.

---

## OpenClaw (Moltbot/Clawdbot)

OpenClaw is the standout open-source project in this space (79K+ GitHub stars as of early 2026). It's a **self-hosted personal AI assistant gateway** that connects to multiple chat platforms simultaneously.

### What It Does

- Acts as a **multi-channel gateway** between messaging apps and AI providers (Anthropic, OpenAI, etc.)
- Supports: **WhatsApp, Telegram, Discord, Slack, Signal, iMessage**, and more
- Runs on your own hardware (Mac mini, Linux server, Raspberry Pi, etc.)
- Has tool execution capabilities — not just chat, but actions (browser automation, webhooks, cron reminders)
- Plugin/skills architecture via "ClawdHub" marketplace
- **Proactive messaging** — can reach out to you first (reminders, updates)
- SQLite for memory and settings (similar to our stack)

### Architecture

```
User (Telegram/Discord/Slack/etc.)
  → OpenClaw Gateway (Node.js)
    → Session/Memory Management
    → Agent Routing + Tool Execution
    → LLM Provider (Anthropic/OpenAI)
```

### Community & Ecosystem

- 79K+ GitHub stars, 130+ contributors, 8.9K+ Discord members
- Cloudflare built "Moltworker" — a proof-of-concept running OpenClaw on Cloudflare Workers + Sandboxes
- Multiple hosting services have sprung up (ClawdHost, etc.)
- Active development with frequent releases

### Relevance to Aether

OpenClaw validates the approach and proves the concept works well, but it's a **standalone product** — we don't want to use it as middleware. Aether should be its own platform. OpenClaw is useful as:
- **Reference architecture** — study how it handles session management, multi-channel routing, and tool execution
- **Inspiration for channel adapters** — its integration patterns for Telegram (`grammY`), Discord (`discord.js`), Slack, etc. are well-proven
- **Validation** — the massive adoption (79K stars) confirms that IM-based AI assistants are a strong UX pattern

---

## Chat Platform Comparison for Integration

### Tier 1: Easiest to Integrate

| Platform | Why | SDK/API Quality | Limitations |
|----------|-----|-----------------|-------------|
| **Telegram** | Gold standard for bot dev. Create a bot in 60 seconds via @BotFather. Simple REST API — often don't even need an SDK. | `node-telegram-bot-api`, `grammY` (TS) — battle-tested | Rate limits can drop messages at scale. Phone number required for account. |
| **Discord** | Excellent bot ecosystem. Rich embeds, buttons, slash commands. | `discord.js` (TS) — mature, well-documented | WebSocket-based (not serverless-friendly). Verification required for 100+ servers. Threading model is per-channel, not per-DM. |
| **Slack** | Best for work contexts. Block Kit UI is powerful. | `@slack/bolt` (TS) — official, robust | Expensive for paid tiers. Free plan limited to 10 integrations. Complex OAuth flow. |

### Tier 2: Viable but More Complex

| Platform | Why | SDK/API Quality | Limitations |
|----------|-----|-----------------|-------------|
| **WhatsApp** | Ubiquitous. OpenClaw uses Baileys (WhatsApp Web protocol). | Baileys (unofficial), Meta Business API (official but $$$) | Official API requires business verification. Unofficial API may break. |
| **Signal** | Best privacy. | `libsignal` exists but integration is hard | No official bot API. Must run as a linked device. Very limited. |
| **iMessage** | Native Apple experience. | No official API. Hacks via AppleScript/Shortcuts | Fragile, macOS-only, no real bot support. |

### Tier 3: Self-Hosted Protocols (Run Your Own Server)

| Platform | Architecture | Bot SDK | Best For |
|----------|-------------|---------|----------|
| **Matrix (Element)** | Federated, decentralized | `matrix-bot-sdk` (TS) — stable | Bridges to everything (Slack, Discord, Telegram, IRC). E2E encrypted. Best interop story. |
| **Mattermost** | Centralized, Slack-like | REST API + webhooks + bot framework | Simple team chat. Go backend, low resources (~512MB RAM). Best Slack replacement. |
| **Rocket.Chat** | Centralized, all-in-one | Apps-Engine framework, REST API | Most features on free tier. LDAP, guest accounts, omnichannel. Heavier (MongoDB). |

---

## Developer Experience Rankings

Based on research and community sentiment:

1. **Telegram** — Fastest time-to-bot. Simple webhook or polling. REST API is clean enough to use with raw `fetch`. Community SDKs are excellent.
2. **Discord** — Great docs, huge community, but WebSocket gateway adds complexity. Best if already in Discord ecosystem.
3. **Matrix** — Best interop story (bridges to everything). `matrix-bot-sdk` (TypeScript) is straightforward. Synapse server is heavy but Dendrite/Conduit are lighter.
4. **Slack** — Powerful but opinionated. Block Kit learning curve. Best for professional/work contexts.
5. **Mattermost** — Clean API, Slack-compatible webhooks. Lightweight. Good if we want to self-host the chat platform too.

---

## Approaches for Aether Integration

### ~~OpenClaw as Middleware~~ (Rejected)

We want Aether to be its own platform, not a layer on top of OpenClaw. Separate systems means split conversation history, no unified UX, and dependency on another project's roadmap.

### Option A: Vercel Chat SDK (Recommended)

Vercel open-sourced the Chat SDK (`npm i chat`) in Feb 2026 — a unified TypeScript library for building bots across multiple platforms from a single codebase. This is our best bet because it dramatically reduces the code we need to write and fits our existing stack perfectly.

#### Why This Is the Right Choice

1. **Native AI SDK integration** — `post()` accepts a Vercel AI SDK text stream directly. Our existing `@ai-sdk/anthropic` setup pipes straight in with zero glue code.
2. **We already know the patterns** — same team, same conventions as the AI SDK we use daily.
3. **Write once, deploy everywhere** — one `onNewMention` handler works across all platforms. Adding a new platform is just `pnpm add @chat-adapter/discord` + env vars.
4. **Thread subscriptions built in** — `thread.subscribe()` handles multi-turn conversations out of the box.
5. **MIT license, not tied to Vercel hosting** — runs anywhere, including our self-hosted TanStack Start setup.

#### How It Works

```ts
import { Chat } from "chat";
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { ToolLoopAgent } from "ai";

const agent = new ToolLoopAgent({
  model: "anthropic/claude-4.6-sonnet",
  instructions: "You are a helpful personal assistant.",
});

const bot = new Chat({
  userName: "aether",
  adapters: {
    telegram: createTelegramAdapter(),
  },
});

bot.onNewMention(async (thread, message) => {
  await thread.subscribe();
  const result = await agent.stream({ prompt: message.text });
  await thread.post(result.textStream); // streams response back to IM
});
```

Adding another platform later:

```ts
import { createDiscordAdapter } from "@chat-adapter/discord";
import { createSlackAdapter } from "@chat-adapter/slack";

const bot = new Chat({
  userName: "aether",
  adapters: {
    telegram: createTelegramAdapter(),
    discord: createDiscordAdapter(),  // just add adapter + env vars
    slack: createSlackAdapter(),
  },
});
// Same handlers work across all platforms — no code changes needed
```

#### Platform Support (v4.20.2, March 2026)

| Platform | Package | Streaming | Cards | Modals | DMs | Weekly Downloads |
|----------|---------|-----------|-------|--------|-----|-----------------|
| **Slack** | `@chat-adapter/slack` | Native | Yes | Yes | Yes | 31.2K |
| **Discord** | `@chat-adapter/discord` | Post+Edit | Yes | No | Yes | — |
| **Telegram** | `@chat-adapter/telegram` | Post+Edit | Partial | No | Yes | 19.9K |
| **Teams** | `@chat-adapter/teams` | Post+Edit | Yes | No | Yes | — |
| **WhatsApp** | `@chat-adapter/whatsapp` | No | Partial | No | Yes | — |
| **GitHub** | `@chat-adapter/github` | No | No | No | No | 5.9K |
| **Linear** | `@chat-adapter/linear` | No | No | No | No | — |

Slack is the most polished adapter. Telegram and Discord are solid for our use case.

#### State Management

Chat SDK uses pluggable state adapters for thread subscriptions and distributed locking:

| Adapter | Package | Notes |
|---------|---------|-------|
| **Redis** | `@chat-adapter/state-redis` | Recommended for production. 20.1K weekly downloads. |
| **PostgreSQL** | `@chat-adapter/state-pg` | Available if we want to avoid adding Redis. |
| **In-memory** | Built-in | Dev/testing only. |

We could use `state-pg` to keep our dependency footprint small, or add Redis if we need the performance.

#### What We Need to Build

1. **Webhook routes** — Add `/api/webhooks/telegram` (and others) to TanStack Start. These are simple `POST` handlers that call `bot.webhooks.telegram(request)`.
2. **Thread ↔ ChatThread mapping** — Map IM platform thread IDs to our existing `ChatThread` database records so conversation history is unified and visible in the web UI too.
3. **Compaction hook** — Wire Anthropic's compaction API into the thread lifecycle when conversations get long (same work needed for web chat).
4. **Session boundaries** — Implement time-based auto-sessions + `/new` command (see Thread/Session Management below).

#### Maturity Assessment

- **Project:** v4.20.2 with 360 releases, 40 contributors, 1068 GitHub stars
- **Team:** Vercel CTO Malte Ubl, Hayden Bleasel, Fernando Rojo — same team behind AI SDK
- **Risk:** Public beta, moving fast (~10 releases/month). API surface may shift.
- **Mitigation:** Our integration surface is small (webhook routes + one handler). Breaking changes would be easy to absorb.
- **Community adapters:** Docs exist for building custom adapters — if we ever need a platform they don't support, we can write one.

### Option B: Direct Platform Integration (Fallback)

If the Chat SDK proves too immature, fall back to a direct Telegram integration:

- Use `grammY` (TypeScript Telegram bot SDK) directly
- Build our own webhook handler and session management
- Single-platform only, would need separate work for each additional platform

**Pros:** Battle-tested SDK, full control, no beta dependencies
**Cons:** Much more code per platform, no cross-platform abstraction

### Option C: Matrix as Universal Bridge (Future consideration)

Self-host a Matrix homeserver (Dendrite for lightweight) + use Matrix bridges:

- Matrix bridges connect to Telegram, Discord, Slack, etc.
- Build one Aether bot that talks Matrix protocol
- All platforms route through Matrix → Aether

**Pros:** One integration covers all platforms. Federation support. E2E encryption.
**Cons:** Most complex to set up. Synapse is resource-heavy (Dendrite/Conduit lighter but less mature). Bridge maintenance. Overkill for a single-user system.

---

## Thread/Session Management for IM

Since IM doesn't have explicit threads like our web chat, options:

1. **Single continuous thread per user** — One long conversation, rely on compaction to manage context. Simplest but loses topic boundaries.
2. **Time-based sessions** — Auto-create new thread after N minutes of inactivity (e.g., 30 min gap = new thread). Natural feeling.
3. **Explicit commands** — User sends `/new` or `/reset` to start a fresh thread. Power-user friendly.
4. **Hybrid** — Time-based auto-split + explicit `/new` command. Best of both worlds.

**Recommendation:** Hybrid approach (option 4). Default to time-based sessions (30 min inactivity timeout) with `/new` command override.

---

## Compaction Strategy for IM

IM conversations will be longer-lived than web chat sessions. Compaction becomes critical:

- Use Anthropic's server-side compaction API (already planned for web chat)
- Trigger compaction at ~50K tokens (configurable)
- Store compacted summaries in the thread record
- IM-specific: may want more aggressive compaction (e.g., 30K tokens) since users won't see the full history anyway

---

## Recommendation

**Use Vercel Chat SDK** (Option A) — it minimizes the code we need to write and fits our existing AI SDK stack perfectly.

### Implementation plan

1. **Install Chat SDK + Telegram adapter** — start with Telegram as the first platform (best bot DX, simplest setup)
2. **Add webhook route** — `/api/webhooks/telegram` in TanStack Start
3. **Wire up AI handler** — `onNewMention` → stream response via `@ai-sdk/anthropic` (same model config as web chat)
4. **Thread mapping** — map Telegram chat IDs → `ChatThread` records in our DB so IM conversations appear in the web UI
5. **Implement compaction** — needed for both web and IM; IM may use more aggressive thresholds (~30K tokens)
6. **Session management** — time-based auto-sessions (30 min inactivity) + `/new` command
7. **Add more platforms** — Discord, Slack, etc. as needed — just add adapter packages + env vars, no logic changes

### Prerequisites

- Compaction feature (already planned) should be built first or in parallel
- Telegram bot token via @BotFather
- Webhook URL (requires public-facing endpoint — use Cloudflare tunnel for dev)

**Use OpenClaw as reference architecture only** — study its patterns for session management and tool execution, but build everything natively in Aether.
