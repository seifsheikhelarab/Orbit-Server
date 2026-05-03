import { getRedisClient } from "./redis.js";
import logger from "./logger.js";

const DEFAULT_TTL = 300;

export async function cacheGet<T>(key: string): Promise<T | null> {
    try {
        const redis = getRedisClient();
        const value = await redis.get(key);
        if (value === null) {
            return null;
        }
        return JSON.parse(value) as T;
    } catch (error) {
        logger.warn(`[Cache] Failed to get key ${key}: ${error}`);
        return null;
    }
}

export async function cacheSet(
    key: string,
    value: unknown,
    ttl: number = DEFAULT_TTL
): Promise<void> {
    try {
        const redis = getRedisClient();
        await redis.set(key, JSON.stringify(value), "EX", ttl);
    } catch (error) {
        logger.warn(`[Cache] Failed to set key ${key}: ${error}`);
    }
}

export async function cacheDelete(key: string): Promise<void> {
    try {
        const redis = getRedisClient();
        await redis.del(key);
    } catch (error) {
        logger.warn(`[Cache] Failed to delete key ${key}: ${error}`);
    }
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
    try {
        const redis = getRedisClient();
        const stream = redis.scanStream({
            match: pattern,
            count: 100
        });

        stream.on("data", async (keys: string[]) => {
            if (keys.length > 0) {
                const pipeline = redis.pipeline();
                keys.forEach((key) => pipeline.del(key));
                await pipeline.exec();
            }
        });
    } catch (error) {
        logger.warn(`[Cache] Failed to delete keys matching ${pattern}: ${error}`);
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
