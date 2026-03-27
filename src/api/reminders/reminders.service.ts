import jwt from "jsonwebtoken";
import prisma from "../../utils/prisma.js";
import { AppError } from "../../utils/response.js";

export async function handleReminderAction(
    token: string,
    action: string
): Promise<{ success: boolean; message: string }> {
    try {
        const decoded = jwt.verify(
            token,
            process.env.REMINDER_ACTION_SECRET || "default_secret"
        ) as { applicationId: string; action: string };

        const application = await prisma.jobApplication.findUnique({
            where: { id: decoded.applicationId }
        });

        if (!application) {
            throw new AppError("Application not found", 404, "NOT_FOUND");
        }

        switch (action) {
            case "snooze_3": {
                const newDate = new Date();
                newDate.setDate(newDate.getDate() + 3);
                await prisma.jobApplication.update({
                    where: { id: decoded.applicationId },
                    data: { followUpDate: newDate }
                });
                return {
                    success: true,
                    message: "Reminder snoozed for 3 days"
                };
            }
            case "snooze_7": {
                const newDate = new Date();
                newDate.setDate(newDate.getDate() + 7);
                await prisma.jobApplication.update({
                    where: { id: decoded.applicationId },
                    data: { followUpDate: newDate }
                });
                return {
                    success: true,
                    message: "Reminder snoozed for 7 days"
                };
            }
            case "done": {
                await prisma.$transaction([
                    prisma.jobApplication.update({
                        where: { id: decoded.applicationId },
                        data: { followUpDate: null, followUpNote: null }
                    }),
                    prisma.notification.updateMany({
                        where: {
                            applicationId: decoded.applicationId,
                            actionedAt: null
                        },
                        data: { actionedAt: new Date() }
                    })
                ]);
                return { success: true, message: "Reminder marked as done" };
            }
            default:
                throw new AppError("Invalid action", 400, "INVALID_ACTION");
        }
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            throw new AppError(
                "Invalid or expired token",
                400,
                "INVALID_TOKEN"
            );
        }
        throw error;
    }
}

export async function clearReminder(applicationId: string, userId: string) {
    const application = await prisma.jobApplication.findFirst({
        where: { id: applicationId, userId }
    });

    if (!application) {
        throw new AppError("Application not found", 404, "NOT_FOUND");
    }

    return prisma.jobApplication.update({
        where: { id: applicationId },
        data: { followUpDate: null, followUpNote: null }
    });
}
