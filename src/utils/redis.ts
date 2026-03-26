import "dotenv/config";
import { RedisClient } from "bun";
import logger from "./logger.js";

let redisClient: RedisClient | null = null;

export function getRedisClient(): RedisClient {
    if (!redisClient) {
        const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
        redisClient = new RedisClient(redisUrl);
    }
    return redisClient;
}

export async function disconnectRedis(): Promise<void> {
    if (redisClient) {
        redisClient.close();
        redisClient = null;
        logger.info("[Init] Redis disconnected");
    }
}
