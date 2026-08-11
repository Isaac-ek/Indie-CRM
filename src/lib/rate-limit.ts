import Redis from "ioredis";
import { logWarn } from "./logger";

export type RateLimitTier = "AUTH" | "AI_VECTOR" | "GENERAL";

export type RateLimitConfig = {
  maxRequests: number;
  windowSeconds: number;
};

export const RATE_LIMIT_TIERS: Record<RateLimitTier, RateLimitConfig> = {
  AUTH: {
    maxRequests: 5,
    windowSeconds: 15 * 60, // 15 minutes
  },
  AI_VECTOR: {
    maxRequests: 20,
    windowSeconds: 60, // 1 minute
  },
  GENERAL: {
    maxRequests: 200,
    windowSeconds: 60, // 1 minute
  },
};

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
};

// In-memory fallback cache when Redis is unavailable or offline
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

let redisClient: Redis | null = null;
let isRedisDisabled = false;

function getRedisClient(): Redis | null {
  if (isRedisDisabled) {
    return null;
  }

  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    try {
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 0,
        enableOfflineQueue: false,
        connectTimeout: 500,
        retryStrategy: () => null, // Do not reconnect on failure; fallback to in-memory store immediately
      });

      redisClient.on("error", (err) => {
        isRedisDisabled = true;
        logWarn("Redis connection offline for rate limiter. Using in-memory fallback store.", {
          error: err.message,
        });
      });
    } catch {
      isRedisDisabled = true;
      return null;
    }
  }

  return redisClient;
}

/**
 * Checks and increments rate limit for a key under a specified rate limit tier.
 */
export async function checkRateLimit(
  key: string,
  tier: RateLimitTier = "GENERAL"
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_TIERS[tier];
  const redisKey = `ratelimit:${tier}:${key}`;
  const now = Math.floor(Date.now() / 1000);

  const client = getRedisClient();

  if (client && client.status === "ready") {
    try {
      const current = await client.incr(redisKey);
      if (current === 1) {
        await client.expire(redisKey, config.windowSeconds);
      }
      const ttl = await client.ttl(redisKey);
      const remaining = Math.max(0, config.maxRequests - current);

      return {
        success: current <= config.maxRequests,
        limit: config.maxRequests,
        remaining,
        resetSeconds: ttl > 0 ? ttl : config.windowSeconds,
      };
    } catch {
      // Fallback to in-memory on Redis error
    }
  }

  // Fallback in-memory sliding window implementation
  return checkInMemoryRateLimit(redisKey, config, now);
}

function checkInMemoryRateLimit(
  redisKey: string,
  config: RateLimitConfig,
  nowSeconds: number
): RateLimitResult {
  const existing = inMemoryStore.get(redisKey);

  if (!existing || nowSeconds >= existing.resetAt) {
    const resetAt = nowSeconds + config.windowSeconds;
    inMemoryStore.set(redisKey, { count: 1, resetAt });
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetSeconds: config.windowSeconds,
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, config.maxRequests - existing.count);
  const resetSeconds = Math.max(1, existing.resetAt - nowSeconds);

  return {
    success: existing.count <= config.maxRequests,
    limit: config.maxRequests,
    remaining,
    resetSeconds,
  };
}

/**
 * Clears in-memory store (primarily for unit testing).
 */
export function resetInMemoryRateLimiter() {
  inMemoryStore.clear();
}
