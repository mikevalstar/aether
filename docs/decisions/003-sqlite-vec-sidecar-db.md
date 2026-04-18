---
title: "ADR-003: sqlite-vec Sidecar Database"
status: accepted
date: 2026-04-18
---

# ADR-003: sqlite-vec Sidecar Database

## Context

Semantic chat search (ADR-era feature efc880e) uses [`sqlite-vec`](https://github.com/asg017/sqlite-vec) to store embeddings in a SQLite virtual table:

```sql
CREATE VIRTUAL TABLE chat_embedding_vec USING vec0(
  thread_id TEXT PRIMARY KEY,
  embedding float[1536]
)
```

Originally this lived in the main Prisma-managed `dev.db`, opened by the app at runtime through a separate `better-sqlite3` connection with the `vec0` extension loaded.

This broke `pnpm db:push`. Prisma's schema engine is a standalone Rust binary — it does *not* use the `@prisma/adapter-better-sqlite3` adapter and has no mechanism to load SQLite extensions. When the engine introspected the DB during `db push`, it tried to describe `chat_embedding_vec`, hit `no such module: vec0`, and aborted with the unhelpful error:

```
Error querying the database: Error code 1: SQL error or missing database
```

Worse, the same virtual table couldn't be dropped via the plain `sqlite3` CLI for the same reason, requiring `PRAGMA writable_schema = ON` + manual `sqlite_master` deletion to recover.

## Decision

Move all `sqlite-vec`-related tables — both the virtual `chat_embedding_vec` and the regular `chat_embedding_meta` metadata table — into a sidecar SQLite file next to the main DB:

- `DATABASE_URL=file:./dev.db` → main DB, owned by Prisma
- `./dev.vec.db` → sidecar, owned by `src/lib/embeddings/db.ts`, `vec0` loaded

The sidecar path is derived automatically from the Prisma path (stem + `.vec` + extension), so env configuration stays unchanged.

A one-time idempotent migration runs on first `getVecDb()` call: it ATTACHes the main DB, copies any legacy `chat_embedding_meta` and `chat_embedding_vec` rows into the sidecar, then drops the legacy tables on a dedicated connection with `vec0` loaded (falling back to `writable_schema` cleanup for shadow rows).

## Rationale

1. **Prisma introspection stays clean forever.** The main DB contains only tables Prisma can describe. `db push`, `migrate`, and `db pull` work without any special handling, CLI flags, or pre-scripts. No footgun for future schema changes.

2. **No CLI extension requirement.** Anyone cloning the repo can run `pnpm db:push` with a stock `sqlite3` or a stock Prisma install. The `vec0` module is only needed at app runtime, where we already have it.

3. **Independent lifecycle.** Vector data is derived — it can be regenerated from `ChatThread.messagesJson` via `pnpm embeddings:backfill` at any time. Keeping it in a separate file makes it trivial to wipe and rebuild (`rm dev.vec.db*`) without touching source-of-truth data. It also makes the sidecar a natural candidate for exclusion from backups.

4. **Encapsulation matches ownership.** Prisma owns `dev.db`; the embeddings module owns `dev.vec.db`. Each tool manages only the schema it defines, with no shared responsibility that produced the original bug.

5. **Migration is free.** Since the sidecar connection has `vec0` loaded, it can ATTACH the main DB and move both regular and virtual-table data across in a single transaction — no data loss for existing installs, and no manual operator steps beyond deploying the code.

## Consequences

- **Two files to back up, not one.** `dev.vec.db` must be included in any backup strategy if you want to avoid re-embedding (which costs API calls). It's already covered by the `dev.db*` gitignore pattern.
- **Cross-DB joins are not possible at the SQL level** between `ChatThread` (main) and `chat_embedding_meta` (sidecar). Search already bridges this in application code (`search.ts` fetches candidates from the vec DB, then looks up thread rows via Prisma) so this is a non-issue in practice.
- **The legacy-migration code in `db.ts` is load-bearing once, then dead weight.** Safe to delete after all deployments have booted once on the sidecar codebase. Leave a removal reminder in a future cleanup pass rather than removing prematurely.
- **Any future SQLite extension** (e.g., `fts5` custom tokenizers, `sqlite-regex`, other virtual-table modules) should follow the same sidecar pattern rather than being added to the Prisma DB.
