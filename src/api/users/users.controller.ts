import type { Response } from "express";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import * as UsersService from "./users.service.js";
import { success, HttpStatus } from "../../utils/response.js";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.js";

export const getCurrentUser = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const user = await UsersService.getCurrentUser(req.user.id);

        success(
            res,
            "User retrieved successfully",
            HttpStatus.OK,
            user,
            req.originalUrl
        );
    }
);

export const updateCurrentUser = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const user = await UsersService.updateCurrentUser(req.user.id, req.body);

        success(
            res,
            "User updated successfully",
            HttpStatus.OK,
            user,
            req.originalUrl
        );
    }
);

export const changePassword = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        await UsersService.changePassword(
            req.user.id,
            req.body.currentPassword,
            req.body.newPassword
        );

        success(
            res,
            "Password changed successfully",
            HttpStatus.OK,
            null,
            req.originalUrl
        );
    }
);

export const deleteAccount = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        await UsersService.deleteAccount(req.user.id);

        success(
            res,
            "Account deleted successfully",
            HttpStatus.OK,
            null,
            req.originalUrl
        );
    }
);
