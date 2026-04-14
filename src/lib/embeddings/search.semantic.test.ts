import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { FIXTURE_QUERIES, FIXTURE_THREADS } from "#/lib/embeddings/__fixtures__/phrases";

/**
 * Regression test against the REAL embedding model.
 *
 * Embeddings are cached in __fixtures__/embeddings.json — regenerate with
 *   pnpm embeddings:fixtures
 * after editing phrases.ts. Tests are deterministic at run time (no API calls).
 *
 * If the fixture file is missing the entire suite is skipped so CI and
 * fresh checkouts don't fail before the fixture is generated.
 */

const FIXTURE_PATH = path.resolve("src/lib/embeddings/__fixtures__/embeddings.json");

type FixtureFile = {
  model: string;
  dims: number;
  embeddings: Record<string, number[]>;
};

const fixture: FixtureFile | null = fs.existsSync(FIXTURE_PATH)
  ? (JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8")) as FixtureFile)
  : null;

// --- Test infra setup (mirrors search.test.ts) ---------------------------

const tempDbPath = path.join(os.tmpdir(), `aether-search-semantic-${process.pid}-${Date.now()}.db`);
process.env.DATABASE_URL = `file:${tempDbPath}`;

const { prismaMock, state } = vi.hoisted(() => {
  type Thread = { id: string; userId: string; title: string; messagesJson: string; updatedAt: Date };
  const state = { threads: [] as Thread[] };
  const prismaMock = {
    chatThread: {
      findMany: vi.fn(
        async ({ where }: { where?: { id?: { in?: string[] }; userId?: string } }) => {
          const idSet = where?.id?.in ? new Set(where.id.in) : null;
          return state.threads
            .filter((t) => (idSet ? idSet.has(t.id) : true))
            .filter((t) => (where?.userId ? t.userId === where.userId : true))
            .map((t) => ({
              id: t.id,
              title: t.title,
              messagesJson: t.messagesJson,
              updatedAt: t.updatedAt,
            }));
        },
      ),
    },
  };
  return { prismaMock, state };
});

vi.mock("#/db", () => ({ prisma: prismaMock }));

const { embedMock } = vi.hoisted(() => ({
  embedMock: vi.fn<(text: string) => Promise<number[]>>(),
}));

vi.mock("#/lib/embeddings/embed", () => ({
  generateEmbedding: embedMock,
  embedThread: vi.fn(),
  EMBEDDING_MODEL: "test-model",
}));

vi.mock("#/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { getVecDb } from "#/lib/embeddings/db";
import { searchChats } from "#/lib/embeddings/search";

function lookup(text: string): number[] {
  const vec = fixture?.embeddings[text];
  if (!vec) throw new Error(`fixture missing embedding for: ${text}`);
  return vec;
}

function seedAllThreads(userId: string): void {
  const db = getVecDb();
  const now = new Date();
  for (const t of FIXTURE_THREADS) {
    state.threads.push({
      id: t.id,
      userId,
      title: t.title,
      messagesJson: JSON.stringify([{ role: "user", parts: [{ type: "text", text: t.title }] }]),
      updatedAt: now,
    });
    db.prepare("INSERT INTO chat_embedding_vec (thread_id, embedding) VALUES (?, ?)").run(
      t.id,
      new Float32Array(lookup(t.title)),
    );
  }
}

function resetState(): void {
  state.threads.length = 0;
  getVecDb().prepare("DELETE FROM chat_embedding_vec").run();
  embedMock.mockReset();
}

// -------------------------------------------------------------------------

describe.skipIf(!fixture)("searchChats — real-model fixture", () => {
  beforeEach(() => {
    resetState();
    seedAllThreads("u1");
  });

  afterAll(() => {
    for (const suffix of ["", "-wal", "-shm"]) {
      try {
        fs.unlinkSync(tempDbPath + suffix);
      } catch {
        /* ignore */
      }
    }
  });

  const topicById = new Map(FIXTURE_THREADS.map((t) => [t.id, t.topic]));

  it.each(FIXTURE_QUERIES)("query %# '$text' → top result in topic(s) $expectTopics", async (q) => {
    embedMock.mockResolvedValueOnce(lookup(q.text));

    const results = await searchChats(q.text, "u1", 3);
    expect(results.length).toBeGreaterThan(0);

    const topTopic = topicById.get(results[0]!.threadId);
    expect(q.expectTopics).toContain(topTopic);
  });

  it("majority of top-3 results belong to the expected topic", async () => {
    // Weaker than strict top-3 purity (the real model has some cross-topic
    // noise — e.g. "vinyl records" leaks into other lifestyle queries) but
    // stronger than top-1 alone. Proves the signal dominates, not just wins.
    for (const q of FIXTURE_QUERIES) {
      resetState();
      seedAllThreads("u1");
      embedMock.mockResolvedValueOnce(lookup(q.text));

      const results = await searchChats(q.text, "u1", 3);
      const correct = results.filter((r) => {
        const topic = topicById.get(r.threadId);
        return topic && q.expectTopics.includes(topic);
      }).length;
      expect(correct, `query "${q.text}"`).toBeGreaterThanOrEqual(2);
    }
  });

  it("top result similarity is meaningfully above the 4th result", async () => {
    // Sanity-check that the real model produces a discriminating signal
    // rather than a flat distribution across all threads.
    for (const q of FIXTURE_QUERIES) {
      resetState();
      seedAllThreads("u1");
      embedMock.mockResolvedValueOnce(lookup(q.text));

      const results = await searchChats(q.text, "u1", 5);
      expect(results[0]!.similarity).toBeGreaterThan(results[4]!.similarity + 0.05);
    }
  });
});
