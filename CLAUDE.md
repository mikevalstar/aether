# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Aether** is a self-hosted personal dashboard and AI agent platform built with TanStack Start, backed by the user's Obsidian vault. Core surfaces: AI chat (Claude + OpenRouter models), markdown-defined workflows, cron-scheduled periodic tasks, event-driven triggers (webhooks + plugin events), a plugin system (Board / Sonarr / Radarr / IMAP / API Balances), and activity + usage tracking.

we are using the latest version of most libraries, these tend to be newer then the training data, so use the skills and/or google for documentation when you don't have an example of how to do something already in the code.

## Redesign

We are currently in the middle of a redesign; attempting to move the design closer to that of the referecne design: docs/aether-redesign2/index.html and a redesign of the chat page specifically docs/aether-redesign/index.html

## Documentation

Documentation is very important in this project. Make sure requirements are updated when new features are built or updated.

## Commands

- we use `pnpm` over `npm`, including `pnpx`
- **Do NOT run `pnpm dev`** — the dev server is always running locally during development. Running it again will hang the process.

### Dev Server Status & Logs

**Check if dev server is running:**
```bash
lsof -i :3000 -sTCP:LISTEN  # look for a LISTEN entry on port 3000
```

**Read recent app logs** (server-side pino logs — JSON, daily-rotated):
```bash
tail -50 logs/aether.$(date +%Y-%m-%d).1.log          # last 50 lines of today's log
tail -50 logs/aether.$(date +%Y-%m-%d).1.log | jq .msg # just the messages
```

**Read recent Vite logs** (HMR, compile, warnings — plain text):
```bash
tail -50 logs/vite.log
```

### Debugging

Reach for **`pnpm debug`** before tailing logs or opening Prisma Studio — it consolidates the most common diagnostic queries into one CLI:

```bash
pnpm debug doctor                  # env + DB + dev server smoke test
pnpm debug logs errors             # error+ entries from today
pnpm debug logs tail --grep "task" # tail today's log with optional filter
pnpm debug tasks status            # scheduled tasks + last run state
pnpm debug triggers status         # event triggers + last fired
pnpm debug usage today             # token + cost rollup by model
pnpm debug chat thread <id>        # full message history for a thread
pnpm debug users                   # list users with role + enabled plugins
pnpm debug models                  # chat models sorted by price (cheapest first)
pnpm debug --help                  # complete command list
```

Most commands take `--user <email>` and `--json`. See **[`docs/debugging.md`](docs/debugging.md)** for the full reference (every subcommand, flag, and example) and the manual `tail | jq` fallbacks for when the CLI itself is broken.

**Cost note for AI testing:** when iterating on AI features (chat behavior, tools, prompts, agent loops), default to the cheapest model that meets the need — run `pnpm debug models` to see the price-sorted list. Most changes behave the same across models, so prefer Haiku 4.5 or Kimi K2.5 unless a test specifically requires Sonnet/Opus quality. Override per-call via the `model:` frontmatter on a task/workflow/trigger.

```bash
pnpm dev          # Start dev server on port 3000
pnpm start        # Production build + serve
pnpm build        # Production build
pnpm test         # Run tests with Vitest
pnpm lint         # Biome lint
pnpm format       # Biome format
pnpm check        # Biome check (lint + format)
pnpm check:fix    # Biome auto fixes what it can

pnpm type-check   # type check with tsc
pnpm type-check:fix

pnpm db:generate  # Generate Prisma client
pnpm db:push      # Push schema to DB without migration
pnpm db:migrate   # Run migrations
pnpm db:studio    # Open Prisma Studio
pnpm db:seed      # Seed the database

pnpm create:first-admin     # Create first admin user
pnpm ai-config:seed         # Seed AI config into the Obsidian vault
pnpm ai-config:pull         # Pull AI config back from the vault
pnpm embeddings:backfill    # Backfill embeddings for vault content
pnpm embeddings:fixtures    # Generate embedding test fixtures
pnpm knip                   # Find unused exports / deps
pnpm knip:fix               # Auto-fix what knip can
```

**Run a single test:**
```bash
pnpm test -- path/to/test.ts
```

**Add a Shadcn component:**
```bash
pnpm dlx shadcn@latest add <component-name>
```

### Storybook

```bash
pnpm storybook        # Start Storybook dev server on port 6006
pnpm build-storybook  # Build static Storybook site
```

## Available CLI Tools

The following tools are available on this machine:
- **gh** — GitHub CLI for PRs, issues, repos
- **rg** — ripgrep for fast content searching
- **jq** — JSON processor for parsing logs and data
- **fzf** — fuzzy finder for interactive selection
- **fd** — fast alternative to `find`
- **pandoc** — document conversion

## Test Account (Agent Browser)

A test user exists for automated browser testing with the agent-browser skill:
- **URL**: `http://localhost:3000/login`
- **Email**: `test@test.com`
- **Password**: `testtest`

## Decisions

Architecture decisions are documented in `docs/decisions/`. When making significant architectural choices, add a new decision record there.

## Architecture

### Stack
- **Framework**: TanStack Start (SSR/streaming meta-framework on Vite 8)
- **Routing**: TanStack Router with file-based routing (`src/routes/`)
- **Database**: SQLite via Prisma 7 with `@prisma/adapter-better-sqlite3`
- **Auth**: Better Auth 1.5 (email/password)
- **AI**: Vercel AI SDK (`ai`, `@ai-sdk/anthropic`) + Assistant UI (`@assistant-ui/react`)
- **State**: Jotai (atoms) + Zustand
- **Styling**: Tailwind CSS v4 + Shadcn UI
- **Linting/Formatting**: Biome (replaces ESLint + Prettier)

### Code Design
- We prefer to use libraries; this project is about the functionality not the code
- We prefer Shadcn or 3rd party Shadcn type components for the UI when available
- We like to have reusable components where possible

### Path Aliases
Both `#/*` and `@/*` resolve to `./src/*`.

### Routing
File-based routing lives in `src/routes/`. TanStack Router auto-generates `src/routes/routeTree.gen.ts` — this file is read-only and should never be manually edited. The root layout is `src/routes/__root.tsx`.

Server functions are created with `createServerFn()`. API routes use a `server` property in route definitions. Data loading uses loaders in route files.

**When adding a new route:** Update the `PAGES` array in `src/components/CommandPalette.tsx` so the new page appears in the `Cmd+K` command palette. Plugin pages are auto-registered via `PluginPage[]` in the plugin client.

**Routes:**
- `/` — Home page
- `/login` — Sign in / sign up
- `/dashboard` — Authenticated dashboard with plugin-contributed widgets
- `/chat`, `/chat/$threadId` — AI chat interface with thread management
- `/chat-debug` — Chat system debug info (models, tools, skills, plugins, config)
- `/tasks`, `/tasks/$`, `/tasks/editor` — Periodic (cron-scheduled) AI tasks list + file editor
- `/workflows`, `/workflows/$`, `/workflows/editor` — Form-based AI workflows list + file editor
- `/triggers`, `/triggers/$`, `/triggers/editor` — Event-driven AI triggers list + file editor
- `/triggers/webhooks` — Webhook URL & API key management
- `/notifications` — In-app notification inbox
- `/scheduled-notifications` — Scheduled notification management
- `/activity` — Activity log (AI actions, file changes, task runs)
- `/usage` — Token usage & cost tracking
- `/logs` — Structured viewer for server (pino) and Vite logs
- `/o`, `/o/$` — Obsidian vault browser
- `/requirements`, `/requirements/$` — Requirements viewer
- `/users` — Invite-only user management
- `/settings` — Settings landing page
- `/settings/profile` — Profile settings
- `/settings/password` — Password settings
- `/settings/chat` — Chat / model preferences
- `/settings/obsidian` — Obsidian vault configuration
- `/settings/calendar` — iCal feed configuration
- `/settings/notifications` — Notification / Pushover preferences
- `/settings/plugins`, `/settings/plugins/$pluginId` — Plugin enable / configure
- `/about` — About page
- `/p/$pluginId`, `/p/$pluginId/$pageId` — Plugin-provided pages (e.g., `/p/board`)
- `/api/auth/$` — Better Auth endpoints
- `/api/chat` — POST streaming chat endpoint
- `/api/triggers/*` — Webhook ingress endpoints for triggers

### Database
Prisma client is a singleton in `src/db.ts` using the `PrismaBetterSqlite3` adapter. Schema is at `prisma/schema.prisma`. Uses `DATABASE_URL` env var (defaults to `file:./dev.db`).

**Models:** User, Session, Account, Verification (Better Auth); ChatThread (messages & usage as JSON), ChatUsageEvent; ActivityLog, FileChangeDetail; Task, Workflow, Trigger, Webhook; Notification, ScheduledNotification; Todo (demo).

### AI Chat
- **Models**: Defined in `src/lib/chat/chat-models.ts`. Anthropic: Claude Haiku 4.5 (default), Sonnet 4.6, Opus 4.6. OpenRouter: GLM-5, GLM-5.1, Kimi K2.5. MiniMax: M2.7 (direct or via OpenRouter). Each model carries `supportsWebTools`, `supportsEffort`, `supportsCodeExecution`, `webToolVersion`, and USD pricing for cost tracking.
- **Streaming**: `/api/chat` streams responses via `@ai-sdk/anthropic`, `@openrouter/ai-sdk-provider`, or `vercel-minimax-ai-provider` based on provider.
- **UI**: `src/components/chat/ChatWorkspace.tsx` manages state via `useChat()`; custom Assistant UI components in `src/components/assistant-ui/`.
- **Shared agent loop**: Chat, workflows, periodic tasks, and triggers all go through the same executor (`src/lib/executor-shared.ts`) so tool access and pricing logic stay consistent.
- **Features**: Multi-turn conversations, token usage & cost tracking, message editing, branch navigation, auto-generated thread titles, markdown + GFM rendering, sub-agents with streaming UI and cost rollups.
- **Env**: Requires `ANTHROPIC_API_KEY`; optionally `OPENROUTER_API_KEY`, `MINIMAX_API_KEY`.

### Authentication
- Server-side config: `src/lib/auth.ts` (Better Auth with TanStack Start cookies plugin)
- Client-side: `src/lib/auth-client.ts` (`authClient` export)
- Server helpers: `src/lib/auth.functions.ts` (`getSession`, `ensureSession`)
- Auth API endpoint: `src/routes/api/auth/$.ts`
- Protected routes use `ensureSession()` in loaders to redirect unauthenticated users

### Styling
Tailwind CSS v4 with custom CSS variables for theming in `src/styles.css`. Light/dark/auto theme managed via Jotai atom in `src/lib/theme.ts`, toggled in `src/components/ThemeToggle.tsx` and persisted to localStorage. Custom fonts: Manrope (sans), Fraunces (display).

**Color Palette — Teal + Coral:**
- **Primary (Teal)**: `--teal` — used for links, primary buttons, active nav indicators, brand identity. `oklch(0.55 0.15 180)` light / `oklch(0.65 0.13 180)` dark.
- **Accent (Coral)**: `--coral` — used for secondary highlights, chart accents, attention-drawing elements. `oklch(0.70 0.14 25)` light / `oklch(0.72 0.12 25)` dark.
- **Teal Subtle**: `--teal-subtle` — tinted backgrounds for secondary/accent surfaces. `oklch(0.94 0.03 180)` light / `oklch(0.22 0.03 180)` dark.
- **Neutrals**: Warm-tinted (hue 80/180) rather than pure gray — gives surfaces subtle warmth.
- **Destructive**: Red tones for errors/danger actions.
- Tailwind theme tokens: `teal`, `teal-subtle`, `coral` available via `bg-teal`, `text-coral`, etc.

### Demo Files
Files/directories prefixed with `demo` (e.g., `src/routes/demo/`, `src/components/demo.*`, `src/hooks/demo.*`) are starter examples that can be deleted once real features replace them.

## Design Context

### Users
Solo personal dashboard — Mike is the only user. The context is daily workflow: checking in on tasks, chatting with AI, managing notes and life tools. Optimized for a single power user who values speed and density over onboarding or discoverability.

### Brand Personality
**Thoughtful, warm, capable.** A reliable personal tool that feels considered and human — not cold or corporate. Despite being information-dense, it should feel like a well-crafted instrument rather than a generic admin panel.

### Aesthetic Direction
- **Sharp & efficient** — information-dense, fast, get-in-get-out. Prioritize scannability and keyboard-driven interaction.
- **Reference apps**: Linear, Raycast — fast developer tools that are dark-mode-friendly, keyboard-first, and respect the user's time.
- **Anti-patterns**: Overly spacious/airy layouts, large hero sections with wasted space, decorative elements that don't serve function, generic SaaS marketing aesthetics.
- **Theme**: Light + dark mode (both supported). Warm neutrals with teal primary and coral accent. Fraunces for display headings, Manrope for everything else.

### Design Principles
1. **Density over whitespace** — Pack useful information into views. Avoid padding-heavy layouts. Every pixel should serve a purpose.
2. **Speed is a feature** — Interactions should feel instant. Favor lightweight animations (150ms transitions), skeleton states, and optimistic UI over loading spinners.
3. **Warm precision** — Clean and structured, but never sterile. Warm-tinted neutrals, subtle teal accents, and considered typography give it soul.
4. **Function first, beauty follows** — Never sacrifice usability for aesthetics. If something looks good but slows the user down, simplify it.
5. **Keyboard-friendly** — Design with keyboard navigation in mind. Actions should be reachable without a mouse where possible.

@FP_CLAUDE.md
