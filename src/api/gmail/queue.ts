import { Queue } from "bullmq";
import { getRedisConnection } from "./redis.js";

export const GMAIL_SYNC_QUEUE = "gmail-sync";

export interface GmailSyncJobData {
    userId: string;
    fullSync: boolean; // true = initial/resync (7 days), false = incremental (since historyId)
}

let queue: Queue<GmailSyncJobData> | null = null;

export function getGmailSyncQueue(): Queue<GmailSyncJobData> {
    if (queue) return queue;

    queue = new Queue<GmailSyncJobData>(GMAIL_SYNC_QUEUE, {
        connection: getRedisConnection(),
        defaultJobOptions: {
            removeOnComplete: 50,
            removeOnFail: 20,
            attempts: 2,
            backoff: { type: "exponential", delay: 30_000 }
        }
    });

    return queue;
}
