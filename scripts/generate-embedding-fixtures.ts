import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { allFixtureTexts } from "#/lib/embeddings/__fixtures__/phrases";
import { generateEmbedding } from "#/lib/embeddings/embed";

const OUTPUT_PATH = path.resolve("src/lib/embeddings/__fixtures__/embeddings.json");

type FixtureFile = {
  model: string;
  dims: number;
  generatedAt: string;
  embeddings: Record<string, number[]>;
};

function loadExisting(): FixtureFile | null {
  if (!fs.existsSync(OUTPUT_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8")) as FixtureFile;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const existing = loadExisting();
  const cache: Record<string, number[]> = existing?.embeddings ?? {};
  const texts = allFixtureTexts();

  const missing = texts.filter((t) => !cache[t]);
  console.log(`Fixture has ${Object.keys(cache).length} cached embeddings. ${missing.length} new to fetch.`);

  for (const text of missing) {
    console.log(`  → ${text}`);
    cache[text] = await generateEmbedding(text);
  }

  // Drop any cached entries that are no longer in the phrase list so the
  // fixture stays minimal and reflects current intent.
  const activeKeys = new Set(texts);
  const pruned: Record<string, number[]> = {};
  for (const key of texts) {
    if (cache[key]) pruned[key] = cache[key];
  }
  const removed = Object.keys(cache).filter((k) => !activeKeys.has(k));
  if (removed.length > 0) {
    console.log(`Pruning ${removed.length} stale entries: ${removed.join(", ")}`);
  }

  const firstEmbedding = Object.values(pruned)[0];
  const payload: FixtureFile = {
    model: "openai/text-embedding-3-small",
    dims: firstEmbedding?.length ?? 0,
    generatedAt: new Date().toISOString(),
    embeddings: pruned,
  };

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload)}\n`);
  console.log(`Wrote ${Object.keys(pruned).length} embeddings → ${OUTPUT_PATH}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fixture generation failed:", err);
    process.exit(1);
  });
