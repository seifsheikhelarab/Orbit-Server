import {
    startReminderCron,
    sendFollowUpReminders
} from "./sendFollowUpReminders.job.js";
import logger from "../utils/logger.js";

export function initJobs(): void {
    startReminderCron();
    logger.info("All cron jobs initialized");
}

export { sendFollowUpReminders };
