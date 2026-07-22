import { Worker } from "bullmq";
import { getRedisConnection } from "./redis.js";
import { GMAIL_SYNC_QUEUE, type GmailSyncJobData } from "./queue.js";
import { runGmailSync } from "./gmail.sync.js";
import prisma from "../../utils/prisma.js";
import logger from "../../utils/logger.js";

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let worker: Worker | null = null;

export function startGmailWorker(): void {
    if (worker) return;

    const connection = getRedisConnection();

    worker = new Worker<GmailSyncJobData>(
        GMAIL_SYNC_QUEUE,
        async (job) => {
            const { userId, fullSync } = job.data;
            logger.info({ userId, jobId: job.id, fullSync }, "Processing Gmail sync job");

            try {
                await runGmailSync(userId, fullSync);
                logger.info({ userId, jobId: job.id }, "Gmail sync job completed");
            } catch (err: any) {
                logger.error({ err, userId, jobId: job.id }, "Gmail sync job failed");

                // Record error on connection
                try {
                    await prisma.gmailConnection.update({
                        where: { userId },
                        data: { lastError: err.message || "Sync failed" }
                    });
                } catch {
                    // Best-effort
                }

                throw err; // Let BullMQ handle retries
            }
        },
        {
            connection,
            concurrency: 1, // Process one sync at a time
            limiter: {
                max: 1,
                duration: 30_000 // At most one job per 30s
            }
        }
    );

    worker.on("failed", (job, err) => {
        logger.error({ jobId: job?.id, err }, "Gmail sync job failed permanently");
    });

    worker.on("completed", (job) => {
        logger.debug({ jobId: job.id, userId: job.data.userId }, "Gmail sync job done");
    });

    // Schedule periodic sync for all active connections
    schedulePeriodicSync();

    logger.info("Gmail sync worker started");
}

async function schedulePeriodicSync(): Promise<void> {
    const { getGmailSyncQueue } = await import("./queue.js");
    const queue = getGmailSyncQueue();

    // Add a repeatable job that runs every 5 minutes
    await queue.add(
        "periodic-sync",
        { userId: "__all__", fullSync: false },
        {
            jobId: "periodic-gmail-sync",
            repeat: { every: SYNC_INTERVAL_MS },
            removeOnComplete: { age: 3600 },
            removeOnFail: { age: 86400 }
        }
    );

    logger.info("Periodic Gmail sync scheduled (every 5 minutes)");
}

export async function stopGmailWorker(): Promise<void> {
    if (worker) {
        await worker.close();
        worker = null;
        logger.info("Gmail sync worker stopped");
    }
}
