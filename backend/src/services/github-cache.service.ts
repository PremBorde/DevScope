/**
 * GitHub API cache service.
 *
 * Strategy (layered):
 *   1. Redis  (primary)  — shared across restarts, TTL 1800s
 *   2. In-memory Map     — fallback when Redis is unavailable
 *
 * All responses include a `cached` flag and `cacheSource` field.
 */

import { logger } from "../lib/logger";
import { redisGet, redisSet, redisDel } from "../config/redis";

export const CACHE_TTL_SECONDS = 1800; // 30 minutes

// In-memory fallback
const memoryCache = new Map<string, { data: unknown; expiresAt: number }>();

function cacheKey(username: string): string {
  return `github:${username.toLowerCase()}`;
}

export async function getCached(username: string): Promise<{ data: unknown; source: "redis" | "memory" } | null> {
  const key = cacheKey(username);

  // 1 — Try Redis first
  const raw = await redisGet(key);
  if (raw) {
    try {
      logger.info({ username, key }, "[CACHE HIT] Redis — returning cached GitHub data");
      return { data: JSON.parse(raw), source: "redis" };
    } catch {
      // corrupt entry — fall through
    }
  }

  // 2 — Try in-memory fallback
  const mem = memoryCache.get(key);
  if (mem && mem.expiresAt > Date.now()) {
    logger.info({ username, key }, "[CACHE HIT] Memory — returning in-memory cached data");
    return { data: mem.data, source: "memory" };
  }

  logger.info({ username, key }, "[CACHE MISS] Fetching fresh data from GitHub API");
  return null;
}

export async function setCached(username: string, data: unknown): Promise<void> {
  const key = cacheKey(username);
  const serialised = JSON.stringify(data);

  // Write to Redis
  await redisSet(key, serialised, CACHE_TTL_SECONDS);

  // Always write memory fallback
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000,
  });

  logger.info({ username, key, ttl: CACHE_TTL_SECONDS }, "[CACHE SET] Stored in Redis + memory");
}

export async function invalidateCache(username: string): Promise<void> {
  const key = cacheKey(username);
  await redisDel(key);
  memoryCache.delete(key);
  logger.info({ username, key }, "[CACHE INVALIDATE] Cleared Redis + memory entries");
}

export function getMemoryCacheStats(): { size: number; keys: string[] } {
  // Purge expired in-memory entries
  const now = Date.now();
  for (const [k, v] of memoryCache) {
    if (v.expiresAt <= now) memoryCache.delete(k);
  }
  return { size: memoryCache.size, keys: [...memoryCache.keys()] };
}
