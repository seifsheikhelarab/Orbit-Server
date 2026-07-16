import "dotenv/config";
import express, { type Application } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./utils/auth.js";
import logger from "./utils/logger.js";
import prisma from "./utils/prisma.js";
import cors from "cors";
import {
    errorHandler,
    notFoundHandler
} from "./middlewares/error.middleware.js";
import apiRouter from "./api/index.js";
import { apiReference } from "@scalar/express-api-reference";
import { rateLimit } from "express-rate-limit";
import { startGmailWorker, stopGmailWorker } from "./api/gmail/gmail.worker.js";

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
        origin: ['https://orbit-applications.vercel.app', 'http://localhost:5173', 'http://localhost:8081'],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    })
);
app.use(
    "/docs",
    apiReference({
        content: {
            openapi: "3.0.0",
            info: { title: "Orbit API", description: "API for managing job applications, documents, and authentication", version: "1.0.0" },
            servers: [{ url: "http://localhost:5726", description: "Development server" }],
            paths: {}
        }
    })
);

const limiter = process.env.LOCAL ? rateLimit({limit: 10000}) : rateLimit({
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

        // Start Gmail sync worker (if Redis is configured)
        if (process.env.UPSTASH_REDIS_URL) {
            try {
                startGmailWorker();
                logger.info("[Init] Gmail sync worker started");
            } catch (err) {
                logger.error({ err }, "[Init] Failed to start Gmail worker — continuing without it");
            }
        }

        const server = app.listen(port, async () => {
            logger.info(`[Init] Server running on http://localhost:${port}`);
            logger.info(`[Init] Scalar docs on http://localhost:${port}/docs`);
        });

        const shutdown = async (signal: string) => {
            logger.info(`${signal} received, shutting down gracefully...`);
            await stopGmailWorker();
            server.close(async () => {
                await prisma.$disconnect();
                logger.info("Server closed");
                process.exit(0);
            });
        };
        process.on("SIGTERM", () => shutdown("SIGTERM"));
        process.on("SIGINT", () => shutdown("SIGINT"));
    } catch (err) {
        logger.error(`Failed to start server: ${err}`);
        process.exit(1);
    }
}

export default app;
