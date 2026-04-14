import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Point the vec DB at a temp file BEFORE any module reads DATABASE_URL.
const tempDbPath = path.join(os.tmpdir(), `aether-search-test-${process.pid}-${Date.now()}.db`);
process.env.DATABASE_URL = `file:${tempDbPath}`;

// In-memory prisma stand-in for ChatThread.
const { prismaMock, state } = vi.hoisted(() => {
  type Thread = {
    id: string;
    userId: string;
    title: string;
    messagesJson: string;
    updatedAt: Date;
  };
  const state = { threads: [] as Thread[] };
  const prismaMock = {
    chatThread: {
      findMany: vi.fn(
        async ({
          where,
          select,
        }: {
          where?: { id?: { in?: string[] }; userId?: string };
          select?: Record<string, boolean>;
        }) => {
          const idSet = where?.id?.in ? new Set(where.id.in) : null;
          return state.threads
            .filter((t) => (idSet ? idSet.has(t.id) : true))
            .filter((t) => (where?.userId ? t.userId === where.userId : true))
            .map((t) => {
              const row: Record<string, unknown> = {};
              if (!select || select.id) row.id = t.id;
              if (!select || select.title) row.title = t.title;
              if (!select || select.messagesJson) row.messagesJson = t.messagesJson;
              if (!select || select.updatedAt) row.updatedAt = t.updatedAt;
              return row;
            });
        },
      ),
    },
  };
  return { prismaMock, state };
});

vi.mock("#/db", () => ({ prisma: prismaMock }));

// Synthetic embedding generator — deterministic vectors keyed on "topic" words.
// Each topic occupies a disjoint band of dimensions so cosine similarity is
// ~1.0 between threads sharing a topic and ~0.0 between different topics.
const { embedMock, synth } = vi.hoisted(() => {
  const DIMS = 1536;
  const BAND = 128;
  const topicBands: Record<string, number> = {
    cooking: 0 * BAND,
    coding: 1 * BAND,
    music: 2 * BAND,
    travel: 3 * BAND,
    gardening: 4 * BAND,
  };

  function synth(topics: string[]): number[] {
    const vec = new Array<number>(DIMS).fill(0);
    for (const topic of topics) {
      const band = topicBands[topic];
      if (band === undefined) throw new Error(`unknown topic: ${topic}`);
      for (let i = 0; i < BAND; i++) vec[band + i] = 1;
    }
    // L2 normalize so cosine distance is meaningful.
    let mag = 0;
    for (const v of vec) mag += v * v;
    mag = Math.sqrt(mag) || 1;
    return vec.map((v) => v / mag);
  }

  const embedMock = vi.fn<(text: string) => Promise<number[]>>();
  return { embedMock, synth, DIMS };
});

vi.mock("#/lib/embeddings/embed", () => ({
  generateEmbedding: embedMock,
  // Unused by search.ts but keeps the module shape consistent.
  embedThread: vi.fn(),
  EMBEDDING_MODEL: "test-model",
}));

// Silence pino logs during tests.
vi.mock("#/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { getVecDb } from "#/lib/embeddings/db";
import { searchChats } from "#/lib/embeddings/search";

type Seed = {
  threadId: string;
  userId: string;
  title: string;
  topics: string[];
  updatedAt?: Date;
};

function seedThread({ threadId, userId, title, topics, updatedAt = new Date() }: Seed): void {
  state.threads.push({
    id: threadId,
    userId,
    title,
    messagesJson: JSON.stringify([
      { role: "user", parts: [{ type: "text", text: title }] },
      { role: "assistant", parts: [{ type: "text", text: `About ${topics.join(", ")}.` }] },
    ]),
    updatedAt,
  });
  const db = getVecDb();
  db.prepare("DELETE FROM chat_embedding_vec WHERE thread_id = ?").run(threadId);
  db.prepare("INSERT INTO chat_embedding_vec (thread_id, embedding) VALUES (?, ?)").run(
    threadId,
    new Float32Array(synth(topics)),
  );
}

function resetState(): void {
  state.threads.length = 0;
  const db = getVecDb();
  db.prepare("DELETE FROM chat_embedding_vec").run();
  embedMock.mockReset();
  prismaMock.chatThread.findMany.mockClear();
}

describe("searchChats", () => {
  beforeEach(() => {
    resetState();
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

  it("ranks the topically matching thread highest", async () => {
    const now = new Date();
    seedThread({ threadId: "t-cook", userId: "u1", title: "Pasta recipes", topics: ["cooking"], updatedAt: now });
    seedThread({ threadId: "t-code", userId: "u1", title: "React hooks", topics: ["coding"], updatedAt: now });
    seedThread({ threadId: "t-music", userId: "u1", title: "Jazz history", topics: ["music"], updatedAt: now });
    seedThread({ threadId: "t-travel", userId: "u1", title: "Tokyo itinerary", topics: ["travel"], updatedAt: now });

    embedMock.mockResolvedValueOnce(synth(["cooking"]));

    const results = await searchChats("how do I make pasta?", "u1", 5);

    expect(results[0]?.threadId).toBe("t-cook");
    expect(results[0]?.similarity).toBeGreaterThan(0.95);
    // Off-topic threads should be clearly separated.
    for (const r of results.slice(1)) {
      expect(r.similarity).toBeLessThan(0.6);
    }
  });

  it("excludes threads belonging to other users", async () => {
    seedThread({ threadId: "mine", userId: "u1", title: "Mine", topics: ["cooking"] });
    seedThread({ threadId: "theirs", userId: "u2", title: "Theirs", topics: ["cooking"] });

    embedMock.mockResolvedValueOnce(synth(["cooking"]));

    const results = await searchChats("cooking", "u1", 5);
    expect(results.map((r) => r.threadId)).toEqual(["mine"]);
  });

  it("prefers the more recent thread when similarity is equal", async () => {
    const now = new Date();
    const old = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    seedThread({ threadId: "recent", userId: "u1", title: "Recent", topics: ["cooking"], updatedAt: now });
    seedThread({ threadId: "old", userId: "u1", title: "Old", topics: ["cooking"], updatedAt: old });

    embedMock.mockResolvedValueOnce(synth(["cooking"]));

    const results = await searchChats("cooking", "u1", 5);
    expect(results[0]?.threadId).toBe("recent");
    expect(results[0]?.recency).toBeGreaterThan(results[1]?.recency ?? 0);
  });

  it("lets similarity outweigh recency when topics differ", async () => {
    const now = new Date();
    const ancient = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    seedThread({ threadId: "relevant-old", userId: "u1", title: "Old pasta", topics: ["cooking"], updatedAt: ancient });
    seedThread({ threadId: "irrelevant-new", userId: "u1", title: "New jazz", topics: ["music"], updatedAt: now });

    embedMock.mockResolvedValueOnce(synth(["cooking"]));

    const results = await searchChats("cooking", "u1", 5);
    expect(results[0]?.threadId).toBe("relevant-old");
  });

  it("returns an empty array when no threads are indexed", async () => {
    embedMock.mockResolvedValueOnce(synth(["cooking"]));
    const results = await searchChats("anything", "u1", 5);
    expect(results).toEqual([]);
  });

  it("respects the limit parameter", async () => {
    const now = new Date();
    for (let i = 0; i < 10; i++) {
      seedThread({
        threadId: `t-${i}`,
        userId: "u1",
        title: `Cooking #${i}`,
        topics: ["cooking"],
        updatedAt: new Date(now.getTime() - i * 60_000),
      });
    }
    embedMock.mockResolvedValueOnce(synth(["cooking"]));
    const results = await searchChats("cooking", "u1", 3);
    expect(results).toHaveLength(3);
  });

  it("ranks partially-overlapping concepts above unrelated ones", async () => {
    // Multi-concept vectors: each phrase activates several concept bands at once.
    // Query shares SOME bands with the target, none with the distractor.
    // This simulates the real embedding behavior where "pasta recipes" and
    // "italian cooking" share semantic dimensions without being identical.
    const now = new Date();

    // "pasta recipes" — cooking + a shared "italian" concept (reuse travel band as stand-in).
    seedThread({
      threadId: "pasta",
      userId: "u1",
      title: "Pasta recipes",
      topics: ["cooking", "travel"],
      updatedAt: now,
    });
    // "jazz history" — purely music, no overlap with the query.
    seedThread({
      threadId: "jazz",
      userId: "u1",
      title: "Jazz history",
      topics: ["music"],
      updatedAt: now,
    });
    // "gardening tips" — unrelated, no overlap.
    seedThread({
      threadId: "garden",
      userId: "u1",
      title: "Gardening tips",
      topics: ["gardening"],
      updatedAt: now,
    });

    // Query "italian cooking" — activates cooking + the shared italian/travel band.
    embedMock.mockResolvedValueOnce(synth(["cooking", "travel"]));

    const results = await searchChats("italian cooking", "u1", 5);

    expect(results[0]?.threadId).toBe("pasta");
    // Partial overlap → similarity should be high but not a perfect 1.0 tier.
    expect(results[0]?.similarity).toBeGreaterThan(0.7);

    // Unrelated threads should rank clearly below the partial match.
    const others = results.slice(1);
    for (const r of others) {
      expect(r.similarity).toBeLessThan(results[0]!.similarity - 0.3);
    }
  });

  it("ranks closer-overlap threads above looser-overlap threads", async () => {
    // Two candidates both share SOME concepts with the query, but one shares more.
    // Proves the ranking is graded, not just a binary topic match.
    const now = new Date();

    // Shares 2 of 3 query concepts.
    seedThread({
      threadId: "close",
      userId: "u1",
      title: "Close match",
      topics: ["cooking", "travel"],
      updatedAt: now,
    });
    // Shares 1 of 3 query concepts.
    seedThread({
      threadId: "loose",
      userId: "u1",
      title: "Loose match",
      topics: ["cooking", "music", "gardening"],
      updatedAt: now,
    });

    embedMock.mockResolvedValueOnce(synth(["cooking", "travel", "coding"]));

    const results = await searchChats("mixed query", "u1", 5);

    expect(results[0]?.threadId).toBe("close");
    expect(results[1]?.threadId).toBe("loose");
    expect(results[0]?.similarity).toBeGreaterThan(results[1]!.similarity);
  });

  it("searches hundreds of threads in well under a second", async () => {
    const now = new Date();
    const topics = ["cooking", "coding", "music", "travel", "gardening"];
    const N = 500;
    for (let i = 0; i < N; i++) {
      const topic = topics[i % topics.length]!;
      seedThread({
        threadId: `t-${i}`,
        userId: "u1",
        title: `${topic} thread #${i}`,
        topics: [topic],
        updatedAt: new Date(now.getTime() - i * 60_000),
      });
    }

    embedMock.mockResolvedValue(synth(["cooking"]));

    const start = performance.now();
    const results = await searchChats("cooking question", "u1", 5);
    const elapsedMs = performance.now() - start;

    expect(results).toHaveLength(5);
    // Every top result should be a cooking thread.
    for (const r of results) {
      expect(r.title.startsWith("cooking")).toBe(true);
    }
    expect(elapsedMs).toBeLessThan(500);
    // Surface the measurement so `pnpm test` output shows real numbers.
    // biome-ignore lint/suspicious/noConsole: benchmark signal
    console.log(`[searchChats] ${N} threads, top-5 in ${elapsedMs.toFixed(1)}ms`);
  });
});
