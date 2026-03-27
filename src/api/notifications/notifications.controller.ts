import type { Response } from "express";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import * as NotificationsService from "./notifications.service.js";
import { ResponseHandler } from "../../utils/response.js";
import { HttpStatus } from "../../utils/response.js";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.js";

export const getNotifications = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const unreadOnly = req.query.unread === "true";

        const { notifications, total } =
            await NotificationsService.getNotifications({
                userId: req.user.id,
                page,
                limit,
                unreadOnly
            });

        ResponseHandler.paginated(
            res,
            notifications,
            "Notifications retrieved successfully",
            page,
            limit,
            total,
            req.originalUrl
        );
    }
);

export const getUnreadCount = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const count = await NotificationsService.getUnreadCount(req.user.id);

        ResponseHandler.success(
            res,
            "Unread count retrieved successfully",
            HttpStatus.OK,
            { count },
            req.originalUrl
        );
    }
);

export const markAsRead = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const notificationId = req.params.id as string;
        await NotificationsService.markAsRead(notificationId, req.user.id);

        ResponseHandler.success(
            res,
            "Notification marked as read",
            HttpStatus.OK,
            null,
            req.originalUrl
        );
    }
);

export const markAllAsRead = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        await NotificationsService.markAllAsRead(req.user.id);

        ResponseHandler.success(
            res,
            "All notifications marked as read",
            HttpStatus.OK,
            null,
            req.originalUrl
        );
    }
);

export const snoozeNotification = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const days = parseInt(req.body.days as string) || 3;
        const notificationId = req.params.id as string;

        await NotificationsService.snoozeNotification(
            notificationId,
            req.user.id,
            days
        );

        ResponseHandler.success(
            res,
            "Notification snoozed",
            HttpStatus.OK,
            null,
            req.originalUrl
        );
    }
);

export const dismissNotification = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const notificationId = req.params.id as string;
        await NotificationsService.dismissNotification(
            notificationId,
            req.user.id
        );

        ResponseHandler.success(
            res,
            "Notification dismissed",
            HttpStatus.OK,
            null,
            req.originalUrl
        );
    }
);
