import prisma from "../../utils/prisma.js";
import { auth } from "../../utils/auth.js";
import { AppError, NotFoundError } from "../../utils/response.js";

export async function getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            name: true,
            image: true,
            googleId: true,
            avatarUrl: true,
            timezone: true,
            emailRemindersEnabled: true,
            inAppNotificationsEnabled: true,
            createdAt: true
        }
    });

    if (!user) {
        throw new NotFoundError("User not found");
    }

    return user;
}

export async function updateCurrentUser(
    userId: string,
    data: {
        name?: string;
        email?: string;
        timezone?: string;
        emailRemindersEnabled?: boolean;
        inAppNotificationsEnabled?: boolean;
    }
) {
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        throw new NotFoundError("User not found");
    }

    return prisma.user.update({
        where: { id: userId },
        data: {
            name: data.name,
            email: data.email,
            timezone: data.timezone,
            emailRemindersEnabled: data.emailRemindersEnabled,
            inAppNotificationsEnabled: data.inAppNotificationsEnabled
        },
        select: {
            id: true,
            email: true,
            name: true,
            image: true,
            googleId: true,
            avatarUrl: true,
            timezone: true,
            emailRemindersEnabled: true,
            inAppNotificationsEnabled: true,
            createdAt: true
        }
    });
}

export async function changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
) {
    try {
        await auth.api.changePassword({
            headers: {},
            body: {
                newPassword,
                currentPassword
            }
        });
    } catch (error: unknown) {
        const err = error as { message?: string };
        if (err.message?.includes("Invalid credentials")) {
            throw new AppError(
                "Current password is incorrect",
                401,
                "INVALID_CREDENTIALS"
            );
        }
        throw new AppError(
            "Failed to change password",
            400,
            "PASSWORD_CHANGE_FAILED"
        );
    }
}

export async function deleteAccount(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        throw new NotFoundError("User not found");
    }

    await prisma.user.delete({
        where: { id: userId }
    });
}
