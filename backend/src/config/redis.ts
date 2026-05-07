import Redis from "ioredis";
import { logger } from "../lib/logger";

const REDIS_URL = process.env.REDIS_URL;

let client: Redis | null = null;

export function getRedisClient(): Redis | null {
  // Skip Redis entirely if no URL is configured
  if (!REDIS_URL) return null;

  if (!client) {
    client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 2000,
      lazyConnect: true,
    });

    client.on("connect", () => logger.info("Redis connected"));
    client.on("ready",   () => logger.info("Redis ready — GitHub API cache active (TTL 1800s)"));
    client.on("error",   (err: Error) => logger.warn({ err: err.message }, "Redis error — falling back to in-memory cache"));
    client.on("close",   () => logger.warn("Redis connection closed"));
  }
  return client;
}

export async function redisGet(key: string): Promise<string | null> {
  try {
    return await getRedisClient()?.get(key) ?? null;
  } catch {
    return null;
  }
}

export async function redisSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  try {
    await getRedisClient()?.set(key, value, "EX", ttlSeconds);
  } catch {
    // silent — in-memory fallback handles it
  }
}

export async function redisDel(key: string): Promise<void> {
  try {
    await getRedisClient()?.del(key);
  } catch {
    // no-op
  }
}

export async function connectRedis(): Promise<void> {
  if (!REDIS_URL) {
    logger.info("REDIS_URL not set — skipping Redis, using in-memory cache");
    return;
  }
  try {
    await getRedisClient()!.connect();
  } catch (err) {
    logger.warn({ err }, "Redis unavailable at startup — in-memory fallback will be used");
  }
}

