import path from "node:path";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { logger } from "#/lib/logger";

const EMBEDDING_DIMS = 1536;

/** Bump this when changing the embedding model or text preparation logic to trigger re-embedding. */
const EMBEDDING_VERSION = 1;

function resolveDbPath(): string {
  const raw = process.env.DATABASE_URL ?? "file:./dev.db";
  const stripped = raw.replace(/^file:/, "");
  return path.resolve(stripped);
}

let _db: Database.Database | null = null;

export function getVecDb(): Database.Database {
  if (_db) return _db;

  const dbPath = resolveDbPath();
  _db = new Database(dbPath);
  sqliteVec.load(_db);
  _db.pragma("journal_mode = WAL");

  // Metadata table — tracks which threads have embeddings
  _db.exec(`
    CREATE TABLE IF NOT EXISTS chat_embedding_meta (
      thread_id TEXT PRIMARY KEY,
      embedded_at TEXT,
      thread_updated_at TEXT NOT NULL,
      text_hash TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT 'openai/text-embedding-3-small',
      version INTEGER NOT NULL DEFAULT 1,
      failed_at TEXT,
      fail_reason TEXT
    )
  `);

  // Add columns if upgrading from an older schema
  migrateMetaTable(_db);

  // sqlite-vec virtual table for vector storage
  _db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS chat_embedding_vec USING vec0(
      thread_id TEXT PRIMARY KEY,
      embedding float[${EMBEDDING_DIMS}]
    )
  `);

  logger.info("Embeddings database initialized with sqlite-vec");
  return _db;
}

function migrateMetaTable(db: Database.Database): void {
  const columns = db.prepare("PRAGMA table_info(chat_embedding_meta)").all() as Array<{ name: string }>;
  const colNames = new Set(columns.map((c) => c.name));

  if (!colNames.has("version")) {
    db.exec("ALTER TABLE chat_embedding_meta ADD COLUMN version INTEGER NOT NULL DEFAULT 1");
  }
  if (!colNames.has("failed_at")) {
    db.exec("ALTER TABLE chat_embedding_meta ADD COLUMN failed_at TEXT");
  }
  if (!colNames.has("fail_reason")) {
    db.exec("ALTER TABLE chat_embedding_meta ADD COLUMN fail_reason TEXT");
  }
}

export { EMBEDDING_DIMS, EMBEDDING_VERSION };
