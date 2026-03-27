import {
    startReminderCron,
    sendFollowUpReminders
} from "./sendFollowUpReminders.job.js";
import {
    startCleanupCron,
    cleanupDeletedDocuments
} from "./cleanupDeletedDocuments.job.js";
import logger from "../utils/logger.js";

export function initJobs(): void {
    startReminderCron();
    startCleanupCron();
    logger.info("All cron jobs initialized");
}

export { sendFollowUpReminders, cleanupDeletedDocuments };
