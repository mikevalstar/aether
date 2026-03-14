# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Aether** is a personal dashboard project built with TanStack Start. The initial focus is an AI chat interface for interacting with an Obsidian library, with plans to expand into broader daily life management tools.

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
- **Framework**: TanStack Start (SSR/streaming meta-framework on Vite 7)
- **Routing**: TanStack Router with file-based routing (`src/routes/`)
- **Database**: PostgreSQL via Prisma 7 with `@prisma/adapter-pg`
- **Auth**: Better Auth 1.5 (email/password)
- **Forms**: TanStack React Form + Zod validation
- **Styling**: Tailwind CSS v4 + Shadcn UI
- **Linting/Formatting**: Biome (replaces ESLint + Prettier)

### Path Aliases
Both `#/*` and `@/*` resolve to `./src/*`.

### Routing
File-based routing lives in `src/routes/`. TanStack Router auto-generates `src/routes/routeTree.gen.ts` — this file is read-only and should never be manually edited. The root layout is `src/routes/__root.tsx`.

Server functions are created with `createServerFn()`. API routes use a `server` property in route definitions. Data loading uses loaders in route files.

### Database
Prisma client is a singleton in `src/db.ts` using the `PrismaPg` adapter. Schema is at `prisma/schema.prisma`. Requires `DATABASE_URL` environment variable.

### Authentication
- Server-side config: `src/lib/auth.ts` (Better Auth with TanStack Start cookies plugin)
- Client-side: `src/lib/auth-client.ts` (`authClient` export)
- Auth API endpoint: `src/routes/api/auth/$.ts`

### Forms
Custom `useAppForm` hook in `src/hooks/demo.form.ts` wraps TanStack React Form with Zod validation (triggered `onBlur`). Context-based field components (`TextField`, `TextArea`, `Select`, `Slider`, `Switch`) are in `src/components/demo.FormComponents.tsx`.

### Styling
Tailwind CSS v4 with custom CSS variables for theming in `src/styles.css`. Light/dark/auto theme is toggled in `src/components/ThemeToggle.tsx` and persisted to localStorage. Color palette centers on teal/sea green.

### Demo Files
Files/directories prefixed with `demo` (e.g., `src/routes/demo/`, `src/components/demo.*`, `src/hooks/demo.*`) are starter examples that can be deleted once real features replace them.
