import path from "node:path";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { logger } from "#/lib/logger";

const EMBEDDING_DIMS = 1536;

/** Bump this when changing the embedding model or text preparation logic to trigger re-embedding. */
const EMBEDDING_VERSION = 1;

function resolveMainDbPath(): string {
  const raw = process.env.DATABASE_URL ?? "file:./dev.db";
  const stripped = raw.replace(/^file:/, "");
  return path.resolve(stripped);
}

/**
 * Sidecar file for sqlite-vec tables so the Prisma-managed main DB stays free
 * of `CREATE VIRTUAL TABLE ... USING vec0(...)` — the Prisma schema engine
 * cannot introspect those and bails out of `db push` with SQLITE_ERROR.
 */
function resolveVecDbPath(): string {
  const main = resolveMainDbPath();
  const ext = path.extname(main) || ".db";
  return `${main.slice(0, main.length - ext.length)}.vec${ext}`;
}

let _db: Database.Database | null = null;

export function getVecDb(): Database.Database {
  if (_db) return _db;

  const vecPath = resolveVecDbPath();
  _db = new Database(vecPath);
  sqliteVec.load(_db);
  _db.pragma("journal_mode = WAL");

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

  migrateMetaTable(_db);

  _db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS chat_embedding_vec USING vec0(
      thread_id TEXT PRIMARY KEY,
      embedding float[${EMBEDDING_DIMS}]
    )
  `);

  migrateLegacyTablesFromMainDb(_db, resolveMainDbPath());

  logger.info({ vecPath }, "Embeddings database initialized with sqlite-vec");
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

/**
 * One-time move of pre-sidecar embedding tables (chat_embedding_meta +
 * chat_embedding_vec*) out of the Prisma-managed main DB. Safe to run on every
 * boot — becomes a no-op once the legacy tables are gone.
 */
function migrateLegacyTablesFromMainDb(vecDb: Database.Database, mainDbPath: string): void {
  try {
    vecDb.exec(`ATTACH DATABASE '${mainDbPath.replace(/'/g, "''")}' AS legacy_main`);
  } catch (err) {
    logger.warn({ err, mainDbPath }, "Could not attach main DB to check for legacy embedding tables");
    return;
  }

  try {
    const legacy = vecDb
      .prepare(
        `SELECT name FROM legacy_main.sqlite_master
         WHERE type IN ('table') AND name LIKE 'chat_embedding%'`,
      )
      .all() as Array<{ name: string }>;

    if (legacy.length === 0) return;

    const names = new Set(legacy.map((r) => r.name));
    logger.info({ legacyTables: [...names] }, "Migrating legacy embedding tables from main DB to vec sidecar");

    if (names.has("chat_embedding_meta")) {
      const cols = vecDb
        .prepare("SELECT name FROM legacy_main.pragma_table_info('chat_embedding_meta')")
        .all() as Array<{ name: string }>;
      const colList = cols.map((c) => `"${c.name}"`).join(", ");
      vecDb.exec(
        `INSERT OR IGNORE INTO chat_embedding_meta (${colList})
         SELECT ${colList} FROM legacy_main.chat_embedding_meta`,
      );
    }

    if (names.has("chat_embedding_vec")) {
      try {
        vecDb.exec(
          `INSERT INTO chat_embedding_vec (thread_id, embedding)
           SELECT thread_id, embedding FROM legacy_main.chat_embedding_vec`,
        );
      } catch (err) {
        logger.warn({ err }, "Could not copy legacy vector rows — backfill will rebuild them");
      }
    }
  } catch (err) {
    logger.error({ err }, "Failed while reading legacy embedding tables");
    try {
      vecDb.exec("DETACH DATABASE legacy_main");
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    vecDb.exec("DETACH DATABASE legacy_main");
  } catch {
    /* ignore */
  }

  // Drop legacy tables on a dedicated connection so the virtual table's
  // vec0 module is available for DROP. writable_schema handles shadow tables
  // that sqlite-vec leaves behind if the module ever fails to load.
  const main = new Database(mainDbPath);
  try {
    sqliteVec.load(main);
    main.exec("DROP TABLE IF EXISTS chat_embedding_vec");
    main.exec("DROP TABLE IF EXISTS chat_embedding_meta");
    main.exec(`
      PRAGMA writable_schema = ON;
      DELETE FROM sqlite_master WHERE name LIKE 'chat_embedding_vec%' OR name = 'chat_embedding_meta';
      PRAGMA writable_schema = OFF;
    `);
    main.exec("VACUUM");
    logger.info("Removed legacy embedding tables from main DB");
  } catch (err) {
    logger.error({ err }, "Failed to drop legacy embedding tables from main DB — run `prisma db push` to clean up");
  } finally {
    main.close();
  }
}

export { EMBEDDING_DIMS, EMBEDDING_VERSION };
