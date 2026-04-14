import { prisma } from "#/db";
import { logger } from "#/lib/logger";
import { EMBEDDING_VERSION, getVecDb } from "./db";
import { embedThread } from "./embed";

export type BackfillResult = {
  total: number;
  embedded: number;
  skipped: number;
  failed: number;
  remaining: number;
  previouslyFailed: number;
};

type MetaRow = {
  thread_id: string;
  thread_updated_at: string;
  version: number;
  failed_at: string | null;
};

export async function backfillEmbeddings(options?: { batchSize?: number }): Promise<BackfillResult> {
  const batchSize = options?.batchSize ?? 50;

  const threads = await prisma.chatThread.findMany({
    where: { type: "chat" },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const db = getVecDb();
  const existingRows = db
    .prepare("SELECT thread_id, thread_updated_at, version, failed_at FROM chat_embedding_meta")
    .all() as MetaRow[];

  const existingMap = new Map(existingRows.map((r) => [r.thread_id, r]));

  let previouslyFailed = 0;

  // Find threads that need embedding
  const needsEmbedding = threads.filter((t) => {
    const prev = existingMap.get(t.id);
    if (!prev) return true;

    const contentChanged = t.updatedAt.toISOString() !== prev.thread_updated_at;
    const versionChanged = prev.version !== EMBEDDING_VERSION;

    // If previously failed and nothing changed, skip it
    if (prev.failed_at && !contentChanged && !versionChanged) {
      previouslyFailed++;
      return false;
    }

    // Re-embed if content or version changed
    return contentChanged || versionChanged;
  });

  let embedded = 0;
  let skipped = 0;
  let failed = 0;

  const batch = needsEmbedding.slice(0, batchSize);

  for (const thread of batch) {
    const result = await embedThread(thread.id);
    if (result.embedded) embedded++;
    else if (result.failed) failed++;
    else skipped++;
  }

  const remaining = needsEmbedding.length - batch.length;

  logger.info(
    { total: threads.length, embedded, skipped, failed, remaining, previouslyFailed },
    "Embedding backfill complete",
  );

  return { total: threads.length, embedded, skipped, failed, remaining, previouslyFailed };
}

export function getEmbeddingStats(): {
  totalEmbedded: number;
  totalFailed: number;
  model: string;
  version: number;
} {
  const db = getVecDb();

  const embedded = db.prepare("SELECT COUNT(*) as count FROM chat_embedding_meta WHERE embedded_at IS NOT NULL").get() as {
    count: number;
  };
  const failed = db.prepare("SELECT COUNT(*) as count FROM chat_embedding_meta WHERE failed_at IS NOT NULL").get() as {
    count: number;
  };
  const modelRow = db.prepare("SELECT model FROM chat_embedding_meta WHERE embedded_at IS NOT NULL LIMIT 1").get() as
    | { model: string }
    | undefined;

  return {
    totalEmbedded: embedded.count,
    totalFailed: failed.count,
    model: modelRow?.model ?? "none",
    version: EMBEDDING_VERSION,
  };
}
