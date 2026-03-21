import type { BalanceResult, CacheEntry, ServiceId } from "./types";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const cache = new Map<string, CacheEntry>();

function cacheKey(userId: string, service: ServiceId): string {
  return `${userId}:${service}`;
}

export function getCached(userId: string, service: ServiceId): BalanceResult | null {
  const entry = cache.get(cacheKey(userId, service));
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    cache.delete(cacheKey(userId, service));
    return null;
  }
  return entry.result;
}

export function setCache(userId: string, service: ServiceId, result: BalanceResult): void {
  cache.set(cacheKey(userId, service), { result, fetchedAt: Date.now() });
}

export function clearCache(userId: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      cache.delete(key);
    }
  }
}
