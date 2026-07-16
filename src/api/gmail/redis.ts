import IORedis from "ioredis";
import logger from "../../utils/logger.js";

let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
    if (connection) return connection;

    const url = process.env.UPSTASH_REDIS_URL;

    if (!url) {
        throw new Error("UPSTASH_REDIS_URL is not set");
    }

    connection = new IORedis(url, {
        maxRetriesPerRequest: null,
        tls: {},
        enableReadyCheck: true,
        retryStrategy(times: number) {
            if (times > 10) {
                logger.error("Redis: max retries reached, giving up");
                return null;
            }
            const delay = Math.min(times * 200, 5000);
            return delay;
        }
    });

    connection.on("error", (err) => {
        logger.error({ err }, "Redis connection error");
    });

    connection.on("connect", () => {
        logger.info("Redis connected");
    });

    return connection;
}
