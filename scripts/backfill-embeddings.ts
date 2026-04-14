import "dotenv/config";
import { backfillEmbeddings, getEmbeddingStats } from "#/lib/embeddings";

async function main() {
  console.log("Starting embedding backfill...");

  const result = await backfillEmbeddings({ batchSize: 100 });

  console.log("Backfill result:", {
    total: result.total,
    embedded: result.embedded,
    skipped: result.skipped,
    failed: result.failed,
    remaining: result.remaining,
  });

  const stats = getEmbeddingStats();
  console.log("Embedding stats:", stats);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
