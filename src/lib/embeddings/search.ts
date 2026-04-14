import { prisma } from "#/db";
import { getChatPreviewFromMessages, parseStoredMessages, threadIdToSlug } from "#/lib/chat/chat";
import { getVecDb } from "./db";
import { generateEmbedding } from "./embed";

export type SearchResult = {
  threadId: string;
  url: string;
  title: string;
  preview: string;
  similarity: number;
  recency: number;
  score: number;
  updatedAt: string;
};

type VecCandidate = {
  thread_id: string;
  distance: number;
};

const SIMILARITY_WEIGHT = 0.8;
const RECENCY_WEIGHT = 0.2;
const RECENCY_HALF_LIFE_DAYS = 30;

function recencyScore(updatedAt: Date): number {
  const daysSince = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  return 1 / (1 + daysSince / RECENCY_HALF_LIFE_DAYS);
}

export async function searchChats(query: string, userId: string, limit = 5): Promise<SearchResult[]> {
  const queryEmbedding = await generateEmbedding(query);
  const db = getVecDb();

  // Fetch more candidates than needed for re-ranking
  const fetchCount = Math.max(limit * 3, 20);
  const candidates = db
    .prepare(
      `SELECT thread_id, distance
       FROM chat_embedding_vec
       WHERE embedding MATCH ?
       ORDER BY distance
       LIMIT ?`,
    )
    .all(new Float32Array(queryEmbedding), fetchCount) as VecCandidate[];

  if (candidates.length === 0) return [];

  // Fetch thread details from Prisma (only the user's threads)
  const threadIds = candidates.map((c) => c.thread_id);
  const threads = await prisma.chatThread.findMany({
    where: { id: { in: threadIds }, userId },
    select: {
      id: true,
      title: true,
      messagesJson: true,
      updatedAt: true,
    },
  });

  const threadMap = new Map(threads.map((t) => [t.id, t]));

  // Score and rank
  const scored: SearchResult[] = [];
  for (const candidate of candidates) {
    const thread = threadMap.get(candidate.thread_id);
    if (!thread) continue; // thread belongs to different user or was deleted

    const similarity = 1 - candidate.distance / 2; // cosine distance [0,2] → similarity [0,1]
    const recency = recencyScore(thread.updatedAt);
    const score = similarity * SIMILARITY_WEIGHT + recency * RECENCY_WEIGHT;

    const messages = parseStoredMessages(thread.messagesJson ?? "[]");

    scored.push({
      threadId: thread.id,
      url: `/chat/${threadIdToSlug(thread.id)}`,
      title: thread.title,
      preview: getChatPreviewFromMessages(messages),
      similarity: Math.round(similarity * 1000) / 1000,
      recency: Math.round(recency * 1000) / 1000,
      score: Math.round(score * 1000) / 1000,
      updatedAt: thread.updatedAt.toISOString(),
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
