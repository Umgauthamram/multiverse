import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";
import { randomUUID } from "node:crypto";

/**
 * Serverless Upstash Redis Client & Distributed Lock Engine
 * Provides atomic concurrency guards, rate-limiting locks, and distributed state
 * for simulation workers.
 */

let redisInstance: Redis | null = null;

/**
 * Returns the singleton Redis instance.
 * Throws a descriptive error if environment credentials are missing.
 */
export function getRedisClient(customUrl?: string, customToken?: string): Redis {
  const url = customUrl || env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = customToken || env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "[Redis] Cannot initialize: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured."
    );
  }

  if (!redisInstance || customUrl || customToken) {
    const client = new Redis({
      url,
      token,
    });
    if (!customUrl && !customToken) {
      redisInstance = client;
    }
    return client;
  }

  return redisInstance;
}

/**
 * Reset Redis instance (useful for testing)
 */
export function resetRedisClient(): void {
  redisInstance = null;
}

/**
 * Lua script for safe atomic release of distributed locks.
 * Only deletes the key if the current value matches the caller's ownerToken.
 */
const RELEASE_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

/**
 * Acquires a distributed lock using Redis SET NX EX.
 * @param lockKey - Resource key to lock (will be prefixed with 'lock:')
 * @param ttlSeconds - Lock expiration in seconds (default: 30s)
 * @param ownerToken - Unique owner identifier (defaults to a random UUID)
 * @returns ownerToken if successfully acquired, or null if already held.
 */
export async function acquireLock(
  lockKey: string,
  ttlSeconds: number = 30,
  ownerToken?: string,
  redisClient?: Redis
): Promise<string | null> {
  const redis = redisClient || getRedisClient();
  const token = ownerToken || randomUUID();
  const fullKey = lockKey.startsWith("lock:") ? lockKey : `lock:${lockKey}`;

  // Redis SET with NX (only if Not eXists) and EX (expire in seconds)
  const result = await redis.set(fullKey, token, {
    nx: true,
    ex: ttlSeconds,
  });

  return result === "OK" ? token : null;
}

/**
 * Releases a distributed lock safely using an atomic Lua script.
 * Prevents releasing a lock that expired and was re-acquired by another worker.
 * @returns true if the lock was released, false if token mismatch or already expired.
 */
export async function releaseLock(
  lockKey: string,
  ownerToken: string,
  redisClient?: Redis
): Promise<boolean> {
  const redis = redisClient || getRedisClient();
  const fullKey = lockKey.startsWith("lock:") ? lockKey : `lock:${lockKey}`;

  const result = await redis.eval(RELEASE_LOCK_LUA, [fullKey], [ownerToken]);
  return result === 1;
}

/**
 * Executes a function within the scope of a distributed lock.
 * Automatically acquires and safely releases the lock.
 */
export async function withLock<T>(
  lockKey: string,
  action: () => Promise<T>,
  ttlSeconds: number = 30,
  redisClient?: Redis
): Promise<T> {
  const token = await acquireLock(lockKey, ttlSeconds, undefined, redisClient);

  if (!token) {
    throw new Error(`[RedisLock] Failed to acquire lock for resource: "${lockKey}"`);
  }

  try {
    return await action();
  } finally {
    await releaseLock(lockKey, token, redisClient);
  }
}

/**
 * Health check ping to verify Upstash Redis connectivity.
 */
export async function isRedisConnected(redisClient?: Redis): Promise<boolean> {
  try {
    const redis = redisClient || getRedisClient();
    const pingResponse = await redis.ping();
    return pingResponse === "PONG";
  } catch (error) {
    console.warn("[Redis] Health check ping failed:", error);
    return false;
  }
}
