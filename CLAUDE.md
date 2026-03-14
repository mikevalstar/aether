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
Tailwind CSS v4 with custom CSS variables for theming in `src/styles.css`. Light/dark/auto theme managed via Jotai atom in `src/lib/theme.ts`, toggled in `src/components/ThemeToggle.tsx` and persisted to localStorage. Color palette centers on teal/sea green. Custom fonts: Manrope (sans), Fraunces (display).

### Demo Files
Files/directories prefixed with `demo` (e.g., `src/routes/demo/`, `src/components/demo.*`, `src/hooks/demo.*`) are starter examples that can be deleted once real features replace them.
