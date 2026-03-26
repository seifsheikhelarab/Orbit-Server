import { getRedisClient } from "./redis.js";

const DEFAULT_TTL = 300;

export async function cacheGet<T>(key: string): Promise<T | null> {
    const redis = getRedisClient();
    const value = await redis.get(key);
    if (value === null) {
        return null;
    }
    return JSON.parse(value) as T;
}

export async function cacheSet(
    key: string,
    value: unknown,
    ttl: number = DEFAULT_TTL
): Promise<void> {
    const redis = getRedisClient();
    await redis.set(key, JSON.stringify(value));
    await redis.expire(key, ttl);
}

export async function cacheDelete(key: string): Promise<void> {
    const redis = getRedisClient();
    await redis.del(key);
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
    const redis = getRedisClient();
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
        await redis.del(...keys);
    }
}

export function generateCacheKey(prefix: string, ...parts: string[]): string {
    return `${prefix}:${parts.join(":")}`;
}

export async function cachedFunction<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = DEFAULT_TTL
): Promise<T> {
    const cached = await cacheGet<T>(key);
    if (cached !== null) {
        return cached;
    }

    const result = await fetchFn();
    await cacheSet(key, result, ttl);
    return result;
}
