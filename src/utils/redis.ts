import "dotenv/config";
import { Redis } from "ioredis";
import logger from "./logger.js";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
    if (!redisClient) {
        const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
        redisClient = new Redis(redisUrl, {
            maxRetriesPerRequest: null,
            lazyConnect: true
        });
        
        redisClient.on("error", (err) => {
            logger.error(`[Redis] Error: ${err.message}`);
        });

        redisClient.on("connect", () => {
            logger.info("[Redis] Connected");
        });
    }
    return redisClient;
}

export async function disconnectRedis(): Promise<void> {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        logger.info("[Init] Redis disconnected");
    }
}
