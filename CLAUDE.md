# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Aether** is a personal dashboard project built with TanStack Start. The primary feature is an AI chat interface powered by Claude (via Vercel AI SDK + Assistant UI), with plans to expand into Obsidian library integration and broader daily life management tools.

we are using the latest version of most libraries, these tend to be newer then the training data, so use the skills and/or google for documentation when you don't have an example of how to do something already in the code.

## Commands

```bash
pnpm dev          # Start dev server on port 3000
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
```

**Run a single test:**
```bash
pnpm test -- path/to/test.ts
```

**Add a Shadcn component:**
```bash
pnpm dlx shadcn@latest add <component-name>
```

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

**Routes:**
- `/` — Home page
- `/login` — Sign in / sign up
- `/dashboard` — Authenticated dashboard (placeholder widgets)
- `/chat` — AI chat interface with thread management
- `/about` — About page
- `/api/auth/$` — Better Auth endpoints
- `/api/chat` — POST streaming chat endpoint

### Database
Prisma client is a singleton in `src/db.ts` using the `PrismaBetterSqlite3` adapter. Schema is at `prisma/schema.prisma`. Uses `DATABASE_URL` env var (defaults to `file:./dev.db`).

**Models:** User, Session, Account, Verification (Better Auth), ChatThread (stores messages & usage as JSON), Todo (demo).

### AI Chat
- **Models**: Claude Haiku 4.5 (default), Sonnet 4.6, Opus 4.6 — defined in `src/lib/chat.ts`
- **Streaming**: `/api/chat` endpoint uses `@ai-sdk/anthropic` to stream responses
- **UI**: `src/components/chat/ChatWorkspace.tsx` manages state via `useChat()` hook; custom Assistant UI components in `src/components/assistant-ui/`
- **Server functions**: `src/lib/chat.functions.ts` — CRUD for chat threads
- **Features**: Multi-turn conversations, token usage tracking, cost estimation, message editing, thread management, markdown rendering with GFM
- **Env**: Requires `ANTHROPIC_API_KEY`

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
