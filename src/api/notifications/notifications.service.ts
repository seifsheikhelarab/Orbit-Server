import prisma from "../../utils/prisma.js";
import { AppError } from "../../utils/response.js";

export interface GetNotificationsOptions {
    userId: string;
    page: number;
    limit: number;
    unreadOnly?: boolean;
    includeActioned?: boolean;
}

export async function getNotifications({
    userId,
    page,
    limit,
    unreadOnly = false,
    includeActioned = false
}: GetNotificationsOptions) {
    const where: Record<string, unknown> = { userId };

    if (unreadOnly) {
        where.readAt = null;
    }

    if (!includeActioned) {
        where.actionedAt = null;
    }

    const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
            where,
            include: {
                application: {
                    select: {
                        id: true,
                        company: true,
                        jobTitle: true
                    }
                }
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit
        }),
        prisma.notification.count({ where })
    ]);

    return { notifications, total };
}

export async function getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
        where: {
            userId,
            readAt: null,
            actionedAt: null
        }
    });
}

export async function markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
        where: { id: notificationId, userId }
    });

    if (!notification) {
        throw new AppError("Notification not found", 404, "NOT_FOUND");
    }

    return prisma.notification.update({
        where: { id: notificationId },
        data: { readAt: new Date() }
    });
}

export async function markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() }
    });
}

export async function snoozeNotification(
    notificationId: string,
    userId: string,
    days: number
) {
    const notification = await prisma.notification.findFirst({
        where: { id: notificationId, userId },
        include: { application: true }
    });

    if (!notification || !notification.applicationId) {
        throw new AppError("Notification not found", 404, "NOT_FOUND");
    }

    const newFollowUpDate = new Date();
    newFollowUpDate.setDate(newFollowUpDate.getDate() + days);

    await prisma.$transaction([
        prisma.jobApplication.update({
            where: { id: notification.applicationId },
            data: { followUpDate: newFollowUpDate }
        }),
        prisma.notification.update({
            where: { id: notificationId },
            data: { actionedAt: new Date() }
        })
    ]);
}

export async function dismissNotification(
    notificationId: string,
    userId: string
) {
    const notification = await prisma.notification.findFirst({
        where: { id: notificationId, userId }
    });

    if (!notification || !notification.applicationId) {
        throw new AppError("Notification not found", 404, "NOT_FOUND");
    }

    await prisma.$transaction([
        prisma.jobApplication.update({
            where: { id: notification.applicationId },
            data: { followUpDate: null, followUpNote: null }
        }),
        prisma.notification.update({
            where: { id: notificationId },
            data: { actionedAt: new Date() }
        })
    ]);
}
