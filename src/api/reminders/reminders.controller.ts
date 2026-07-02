import type { Response } from "express";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import * as RemindersService from "./reminders.service.js";
import { success, error as sendError, HttpStatus, ErrorCode } from "../../utils/response.js";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.js";

export const clearReminder = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const applicationId = req.params.id as string;
        await RemindersService.clearReminder(applicationId, req.user.id);

        success(
            res,
            "Reminder cleared",
            HttpStatus.OK,
            null,
            req.originalUrl
        );
    }
);

export const handleReminderAction = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const { token, action } = req.query;

        if (!token || !action) {
            sendError(
                res,
                "Token and action are required",
                ErrorCode.INVALID_INPUT,
                HttpStatus.BAD_REQUEST
            );
            return;
        }

        const result = await RemindersService.handleReminderAction(
            token as string,
            action as string
        );

        success(
            res,
            result.message,
            HttpStatus.OK,
            result,
            req.originalUrl
        );
    }
);
