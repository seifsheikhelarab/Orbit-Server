import cron from "node-cron";
import prisma from "../utils/prisma.js";
import {
    createEmailService,
    type ReminderEmailData
} from "../services/email/index.js";
import logger from "../utils/logger.js";

export async function sendFollowUpReminders(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const applications = await prisma.jobApplication.findMany({
        where: {
            followUpDate: {
                lte: tomorrow,
                gte: new Date(
                    new Date().setFullYear(new Date().getFullYear() - 1)
                ),
                not: null
            }
        },
        include: {
            user: true,
            reminderJobs: {
                where: {
                    scheduledDate: {
                        gte: today,
                        lt: tomorrow
                    },
                    sentAt: {
                        not: null
                    }
                }
            }
        }
    });

    const toSend = applications.filter(
        (app) => app.reminderJobs.length === 0 && app.user.email
    );

    const skipped = applications.length - toSend.length;

    let sent = 0;
    let errors = 0;

    const emailService = createEmailService();

    for (const app of toSend) {
        try {
            await prisma.reminderJob.create({
                data: {
                    applicationId: app.id,
                    scheduledDate: today
                }
            });

            const isOverdue =
                app.followUpDate && app.followUpDate < today
                    ? "FOLLOW_UP_OVERDUE"
                    : "FOLLOW_UP_DUE";

            const emailData: ReminderEmailData = {
                userName: app.user.name,
                userEmail: app.user.email,
                company: app.company,
                jobTitle: app.jobTitle,
                status: app.applicationStatus,
                appliedDate: app.appliedDate
                    ? app.appliedDate.toLocaleDateString()
                    : "N/A",
                followUpNote: app.followUpNote || undefined,
                applicationId: app.id
            };

            await emailService.sendReminderEmail(app.user.email, emailData);

            await prisma.notification.create({
                data: {
                    userId: app.userId,
                    applicationId: app.id,
                    type: isOverdue,
                    title: `Follow-up reminder: ${app.jobTitle} at ${app.company}`,
                    body:
                        app.followUpNote ||
                        `Time to follow up on your application`
                }
            });

            await prisma.reminderJob.updateMany({
                where: {
                    applicationId: app.id,
                    scheduledDate: today,
                    sentAt: null
                },
                data: {
                    sentAt: new Date()
                }
            });

            sent++;
        } catch (error) {
            errors++;
            logger.error(
                { err: error },
                `Failed to send reminder for application ${app.id}`
            );
        }
    }

    logger.info(
        `Reminder cron complete: ${sent} sent, ${skipped} skipped, ${errors} errors`
    );
}

export function startReminderCron(): void {
    const schedule = process.env.REMINDER_CRON_SCHEDULE || "0 8 * * *";
    cron.schedule(schedule, sendFollowUpReminders);
    logger.info(`Reminder cron scheduled: ${schedule}`);
}
