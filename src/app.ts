import "dotenv/config";
import express, { type Application } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./utils/auth.js";
import logger from "./utils/logger.js";
import prisma from "./utils/prisma.js";
import { getRedisClient, disconnectRedis } from "./utils/redis.js";
import cors from "cors";
import helmet from "helmet";
import {
    errorHandler,
    notFoundHandler
} from "./middlewares/error.middleware.js";
import apiRouter from "./api/index.js";
import { apiReference } from "@scalar/express-api-reference";
import { generateOpenAPISpec } from "./utils/openapi.js";
// import { initJobs } from "./jobs/index.js";
import { rateLimit } from "express-rate-limit";

/**
 * Default Express app
 *
 * @type {Application}
 */
const app: Application = express();
/**
 * Local Port to run the app
 *
 * @type {number}
 */
const port: string | number = process.env.PORT || 5726;

// Express middleware initialization
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://orbit-applications.vercel.app"
        ],
        credentials: true
    })
);
app.use(
    "/docs",
    apiReference({
        content: generateOpenAPISpec()
    })
);

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    ipv6Subnet: 56
});

app.use(limiter);

app.all("/api/auth/*splat", toNodeHandler(auth));

// Application routes
app.use("/api/v1", apiRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Start the Express server after verifying database connectivity.
 *
 * @returns A promise that resolves after startup hooks are registered.
 */
export async function startServer(): Promise<void> {
    try {
        await prisma.$queryRaw`SELECT 1`;
        logger.info("[Init] Database connected successfully");

        try {
            getRedisClient();
            logger.info("[Init] Redis connected successfully");
        } catch (redisErr) {
            logger.warn(
                `Redis connection failed (caching disabled): ${redisErr}`
            );
        }

        const server = app.listen(port, async () => {
            logger.info(`[Init] Server running on http://localhost:${port}`);
            logger.info(`[Init] Scalar docs on http://localhost:${port}/docs`);
            // initJobs();
        });

        process.on("SIGTERM", async () => {
            logger.info("SIGTERM received, shutting down gracefully...");
            server.close(async () => {
                await prisma.$disconnect();
                await disconnectRedis();
                logger.info("Server closed");
                process.exit(0);
            });
        });

        process.on("SIGINT", async () => {
            logger.info("SIGINT received, shutting down gracefully...");
            server.close(async () => {
                await prisma.$disconnect();
                await disconnectRedis();
                logger.info("Server closed");
                process.exit(0);
            });
        });
    } catch (err) {
        logger.error(`Failed to start server: ${err}`);
        process.exit(1);
    }
}

export default app;
