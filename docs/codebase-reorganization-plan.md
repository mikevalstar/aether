---
title: "Project Structure Reorganization Plan"
date: 2026-03-20
---

# Project Structure Reorganization Plan

## Context

The Aether codebase currently has no enforced separation between server-only code, client-only code, and shared code. The `src/lib/` directory mixes all three categories, relying on naming conventions (`.server.ts`, `.shared.ts`, `.functions.ts`) and developer discipline rather than build-time enforcement.

This creates risk of:
- Accidentally importing server-only code (database, file system, auth secrets) into client bundles
- Unclear ownership of utilities and types
- Difficulty reasoning about code boundaries
- Potential security vulnerabilities from leaked server-only modules

## Current State

### Directory Structure

```
src/
├── db.ts                    # Prisma client singleton
├── router.tsx               # TanStack Router config
├── routeTree.gen.ts         # Auto-generated
├── styles.css               # Global styles
├── components/              # All React components
│   ├── ui/                  # Shadcn components
│   ├── chat/                # Chat feature
│   ├── assistant-ui/        # Custom Assistant UI
│   ├── obsidian/            # Obsidian vault browser
│   ├── requirements/        # Requirements viewer
│   └── [other features]
├── routes/                  # TanStack Router file routes
│   ├── api/                 # API endpoints
│   └── [page routes]
├── lib/                     # Business logic (MIXED)
│   ├── auth.ts              # Server auth config
│   ├── auth-client.ts       # Client auth
│   ├── auth.functions.ts    # Server functions
│   ├── chat.functions.ts    # Server functions
│   ├── chat.ts              # Shared types
│   ├── chat-models.ts       # Shared constants
│   ├── board.server.ts      # Server-only (named)
│   ├── board.functions.ts   # Server functions
│   ├── kanban-parser.ts     # Shared parser
│   ├── tools/               # AI tools (server-side)
│   ├── theme.ts             # Jotai atoms (client)
│   ├── utils.ts             # Shared utilities
│   └── [many mixed files]
├── hooks/                   # React hooks
└── integrations/            # Third-party integrations
```

### Current Separation Mechanisms

| Pattern | Example | Enforcement |
|---------|---------|--------------|
| `.server.ts` suffix | `board.server.ts` | Naming convention only |
| `.shared.ts` suffix | `ai-config.shared.ts` | Naming convention only |
| `.functions.ts` suffix | `auth.functions.ts` | Naming convention only |
| `.client.ts` suffix | `auth-client.ts` | Naming convention only |
| `createServerFn()` | `chat.functions.ts` | Runtime only |

TanStack Start does not enforce server/client boundaries. The `server-only` npm package could be used but is not currently employed.

---

## Proposed Structure

### Core Principle

Organize code into three explicit zones with enforced imports:

```
src/
├── server/                   # SERVER-ONLY code (never to client)
│   ├── db.ts                 # Prisma client singleton
│   ├── auth.ts               # Better Auth server config
│   ├── logger.ts             # Pino logger
│   ├── ai/                   # AI-specific server code
│   │   ├── config.ts         # AI config file access
│   │   └── tools/            # AI tool definitions
│   ├── tasks/                # Task system
│   ├── workflows/            # Workflow system
│   └── [feature]/            # Feature-specific server code
│       ├── index.ts         # Re-exports for public API
│       └── *.server.ts       # Server-only internals
│
├── client/                   # CLIENT-ONLY code (never to server)
│   ├── auth-client.ts        # Better Auth client instance
│   ├── theme.ts              # Jotai atoms + theme logic
│   ├── components/           # Client-only components
│   │   └── [existing components move here]
│   ├── hooks/                # Client-only hooks
│   └── [feature]/            # Feature-specific client code
│
├── shared/                   # SHARED code (safe for both)
│   ├── types/                # TypeScript interfaces/types
│   ├── utils.ts              # Pure utility functions
│   ├── date.ts               # Date formatting
│   ├── constants.ts          # Shared constants
│   └── [feature]/            # Feature-specific shared code
│       ├── types.ts
│       ├── validators.ts     # Zod schemas
│       └── utils.ts
│
├── routes/                   # TanStack Router routes (FEATURE-OWNER)
│   ├── __root.tsx
│   ├── api/
│   │   └── [api routes]
│   └── [page routes]
│
└── components/               # SHARED components only
    ├── ui/                   # Shadcn/ui components
    └── shared/               # Cross-feature shared components
```

### Zone Definitions

#### Zone 1: `src/server/` — Server-Only

**What goes here:**
- Prisma client and database operations
- Better Auth server configuration
- File system operations (Obsidian vault, board files)
- Environment variable access
- Pino logger setup
- AI tool definitions and implementations
- Task scheduler and workflow executor
- Background job management
- API key management

**What MUST NOT happen:**
- This directory must NOT be importable from client code
- No React components (except for API route handlers)
- No browser APIs

**Enforcement:**
```typescript
// src/server/db.ts
import 'server-only'
export const db = new PrismaClient()
```

Using the `server-only` npm package causes a compile-time error if imported on the client.

#### Zone 2: `src/client/` — Client-Only

**What goes here:**
- Better Auth client instance (`auth-client.ts`)
- Jotai atoms and theme state
- Zustand stores
- Client-side hooks
- Browser-only components
- Components that use `use client` directive

**What MUST NOT happen:**
- This directory must NOT be importable from server code
- No Prisma imports
- No file system imports
- No server-only utilities

**Enforcement:**
TanStack Start / React's `"use client"` directive at the top of files.

#### Zone 3: `src/shared/` — Shared/Safe

**What goes here:**
- TypeScript interfaces and types (no implementation)
- Zod validation schemas
- Pure utility functions (date formatting, string manipulation)
- Constants (model names, status values)
- Feature-specific shared types

**Characteristics:**
- Must be pure TypeScript (no side effects)
- No imports from `server/` or `client/`
- Safe to import from anywhere

---

## Feature-Based Organization

Within each zone, organize by feature rather than by technical category:

### Example: Chat Feature

```
src/
├── server/
│   └── chat/
│       ├── index.ts              # Public API (createServerFn exports)
│       ├── repository.server.ts  # Database operations
│       └── usage.server.ts       # Usage tracking
│
├── client/
│   └── chat/
│       ├── index.ts              # Client exports
│       ├── use-chat.ts           # Chat state hook
│       └── ChatWorkspace.tsx     # Chat component
│
└── shared/
    └── chat/
        ├── types.ts              # ChatThread, Message types
        ├── validators.ts         # Zod schemas
        └── constants.ts          # Model names, limits
```

### Example: Board/Kanban Feature

```
src/
├── server/
│   └── board/
│       ├── index.ts              # Public API
│       ├── repository.server.ts  # File I/O, path resolution
│       └── kanban-parser.server.ts  # Parsing with fs dependency
│
├── client/
│   └── board/
│       ├── index.ts
│       ├── BoardView.tsx
│       ├── BoardColumn.tsx
│       └── use-board-store.ts    # Zustand store
│
└── shared/
    └── board/
        ├── types.ts              # Board, Column, Task interfaces
        ├── kanban-schema.ts      # Kanban structure types
        └── validators.ts         # Zod schemas for board data
```

---

## Import Rules

### Allowed Imports

| From | May Import |
|------|------------|
| `server/` | `server/`, `shared/` |
| `client/` | `shared/`, `client/` |
| `shared/` | `shared/` |
| `routes/` | `server/` (via createServerFn), `shared/`, `client/`, `components/` |
| `components/ui/` | `shared/` |

### Forbidden Imports (compile-time error)

| From | May NOT Import |
|------|---------------|
| `server/` | `client/`, routes (except via server handlers) |
| `client/` | `server/` |
| `shared/` | `server/`, `client/` |

### Implementation

1. **server-only package** — Add to `src/server/` files:
   ```bash
   pnpm add server-only
   ```
   ```typescript
   import 'server-only'
   ```

2. **Use explicit barrel exports** — Each zone exposes only what should be public via `index.ts` files

3. **Path aliases update** — Update `tsconfig.json` and Vite config:
   ```json
   {
     "paths": {
       "@server/*": "./src/server/*",
       "@client/*": "./src/client/*",
       "@shared/*": "./src/shared/*",
       "@/*": "./src/*"
     }
   }
   ```

---

## Migration Plan

### Phase 1: Create New Directory Structure

1. Create directories:
   ```
   src/server/
   src/client/
   src/shared/
   ```

2. Create placeholder `index.ts` files in each

### Phase 2: Identify and Categorize All Files

Run analysis to categorize each file in `src/lib/`:

**Server-only (move to `src/server/`):**
- `db.ts` → `src/server/db.ts`
- `auth.ts` → `src/server/auth.ts`
- `logger.ts` → `src/server/logger.ts`
- `auth.functions.ts` → `src/server/auth/index.ts`
- `chat.functions.ts` → `src/server/chat/index.ts`
- `board.server.ts` → `src/server/board/repository.server.ts`
- `board.functions.ts` → `src/server/board/index.ts`
- `obsidian.ts` → `src/server/obsidian/index.ts`
- `ai-config.ts` → `src/server/ai/config.ts`
- `ai-tools.ts` → `src/server/ai/tools/index.ts`
- `task-*.ts` → `src/server/tasks/`
- `workflow-*.ts` → `src/server/workflows/`
- `tools/*.ts` → `src/server/tools/`
- All `*.functions.ts` files → `src/server/[feature]/index.ts`

**Client-only (move to `src/client/`):**
- `auth-client.ts` → `src/client/auth-client.ts`
- `theme.ts` → `src/client/theme.ts`
- `hooks/` → `src/client/hooks/`

**Shared (move to `src/shared/`):**
- `chat.ts` → `src/shared/chat/types.ts`
- `chat-models.ts` → `src/shared/chat/constants.ts`
- `chat-usage.ts` → `src/shared/chat/usage.ts`
- `preferences.ts` → `src/shared/preferences/types.ts`
- `requirements.ts` → `src/shared/requirements/types.ts`
- `utils.ts` → `src/shared/utils.ts`
- `date.ts` → `src/shared/date.ts`
- `calendar/types.ts` → `src/shared/calendar/types.ts`

### Phase 3: Add server-only Imports

For each server-only file, add:
```typescript
import 'server-only'
```

### Phase 4: Update All Import Paths

Update all imports throughout the codebase to use new paths:
- `#/lib/chat` → `#/shared/chat/types`
- `#/lib/auth.functions` → `#/server/auth`
- etc.

### Phase 5: Create Feature Barrel Exports

Each feature gets an `index.ts` that re-exports the public API:

```typescript
// src/server/chat/index.ts
import 'server-only'
export { getChatThreads, createChatThread, deleteChatThread } from './functions'
export { getChatPageData } from './queries'
```

```typescript
// src/shared/chat/index.ts
export type { ChatThread, Message } from './types'
export { chatModels, defaultModel } from './constants'
```

### Phase 6: Component Organization

Move feature components to appropriate locations:

**Shared components** (can be imported anywhere):
- `src/components/ui/` — Shadcn components remain here
- `src/components/markdown/` — Markdown rendering

**Client-only components** (use client state/hooks):
- `src/client/components/` or co-locate with feature in `src/client/[feature]/`

**Route-owned components** (only used by one route):
- Keep in `src/routes/` or move to `src/components/[feature]/`

### Phase 7: Verify with Build

1. Run `pnpm build` to check for errors
2. Check that client bundle does not include server-only code
3. Run `pnpm check` for Biome linting
4. Run `pnpm type-check` for TypeScript errors

---

## Benefits

1. **Compile-time safety** — The `server-only` package prevents server code from leaking to client
2. **Clear ownership** — Every file has a clear home and purpose
3. **Easier onboarding** — New developers know exactly where to put code
4. **Improved refactoring** — Clear boundaries make it easier to change implementation details
5. **Better tree-shaking** — Explicit exports enable better bundler optimization
6. **Security** — Reduces risk of accidentally exposing secrets

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking all imports | Phased migration with path aliases during transition |
| TanStack Start incompatibility | Test early with build verification |
| Over-engineering for single-user | Keep structure pragmatic, don't create unnecessary depth |
| Migration time | Focus on highest-impact separations first |

## Decision Points

1. **Keep `src/lib/` or remove it?** — Recommend removing `src/lib/` entirely; new structure makes it redundant
2. **Co-locate components with features or keep flat `components/`?** — Recommend co-location within zones (client components with client code, server code in server)
3. **How to handle route files?** — Routes stay in `src/routes/` but should only import from `server/` (via createServerFn), `shared/`, and `components/ui/`
4. **Storybook stories location?** — Keep co-located with components; they are development artifacts not production code
