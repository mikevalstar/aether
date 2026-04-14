import { createHash } from "node:crypto";
import { prisma } from "#/db";
import { getMessageText, parseStoredMessages } from "#/lib/chat/chat";
import { logger } from "#/lib/logger";
import { EMBEDDING_DIMS, EMBEDDING_VERSION, getVecDb } from "./db";

const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const MAX_TEXT_CHARS = 24_000; // ~6k tokens, well within 8191-token limit

function prepareThreadText(title: string, messagesJson: string): string {
  const messages = parseStoredMessages(messagesJson);

  const parts: string[] = [`Title: ${title}`];

  for (const msg of messages) {
    if (msg.role !== "user" && msg.role !== "assistant") continue;
    const text = getMessageText(msg);
    if (!text) continue;
    const role = msg.role === "user" ? "User" : "Assistant";
    parts.push(`${role}: ${text}`);
  }

  const full = parts.join("\n");
  if (full.length <= MAX_TEXT_CHARS) return full;

  // Truncate from end, keeping title + early messages (which frame the topic)
  return full.slice(0, MAX_TEXT_CHARS);
}

function textHash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set — cannot generate embeddings");
  }

  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter embeddings API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };

  const embedding = data.data[0]?.embedding;
  if (!embedding || embedding.length !== EMBEDDING_DIMS) {
    throw new Error(`Unexpected embedding dimensions: got ${embedding?.length}, expected ${EMBEDDING_DIMS}`);
  }

  return embedding;
}

type EmbedResult = { embedded: boolean; skipped: boolean; failed: boolean };

export async function embedThread(threadId: string): Promise<EmbedResult> {
  const thread = await prisma.chatThread.findFirst({
    where: { id: threadId },
    select: {
      id: true,
      title: true,
      messagesJson: true,
      updatedAt: true,
    },
  });

  if (!thread) {
    return { embedded: false, skipped: true, failed: false };
  }

  const messages = parseStoredMessages(thread.messagesJson ?? "[]");
  if (messages.length === 0) {
    return { embedded: false, skipped: true, failed: false };
  }

  const text = prepareThreadText(thread.title, thread.messagesJson ?? "[]");
  const hash = textHash(text);

  const db = getVecDb();

  // Check existing metadata
  const existing = db
    .prepare("SELECT text_hash, version, failed_at FROM chat_embedding_meta WHERE thread_id = ?")
    .get(thread.id) as { text_hash: string; version: number; failed_at: string | null } | undefined;

  const contentChanged = existing?.text_hash !== hash;
  const versionChanged = existing ? existing.version !== EMBEDDING_VERSION : false;

  // Skip if content and version unchanged (whether previously succeeded or failed)
  if (existing && !contentChanged && !versionChanged) {
    return { embedded: false, skipped: true, failed: false };
  }

  try {
    const embedding = await generateEmbedding(text);
    const vecBuffer = new Float32Array(embedding);

    // sqlite-vec doesn't support ON CONFLICT — delete then insert
    db.prepare("DELETE FROM chat_embedding_vec WHERE thread_id = ?").run(thread.id);
    db.prepare("INSERT INTO chat_embedding_vec (thread_id, embedding) VALUES (?, ?)").run(thread.id, vecBuffer);

    // Upsert metadata — clear any previous failure
    db.prepare(
      `INSERT OR REPLACE INTO chat_embedding_meta
       (thread_id, embedded_at, thread_updated_at, text_hash, model, version, failed_at, fail_reason)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)`,
    ).run(thread.id, new Date().toISOString(), thread.updatedAt.toISOString(), hash, EMBEDDING_MODEL, EMBEDDING_VERSION);

    logger.info({ threadId: thread.id }, "Thread embedded");
    return { embedded: true, skipped: false, failed: false };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);

    // Record the failure so backfill doesn't retry until content or version changes
    db.prepare(
      `INSERT OR REPLACE INTO chat_embedding_meta
       (thread_id, embedded_at, thread_updated_at, text_hash, model, version, failed_at, fail_reason)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?)`,
    ).run(
      thread.id,
      thread.updatedAt.toISOString(),
      hash,
      EMBEDDING_MODEL,
      EMBEDDING_VERSION,
      new Date().toISOString(),
      reason.slice(0, 500),
    );

    logger.error({ err, threadId: thread.id }, "Failed to embed thread");
    return { embedded: false, skipped: false, failed: true };
  }
}

export { EMBEDDING_MODEL };
