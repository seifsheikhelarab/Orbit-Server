import type { Response } from "express";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import * as InboxService from "./inbox.service.js";
import { success, paginated, HttpStatus } from "../../utils/response.js";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.js";

export const getInboxEntries = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const page = Math.max(parseInt(req.query.page as string) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 50);
        const filter = (req.query.filter as string) || "all";
        const search = (req.query.search as string) || undefined;

        const validFilter = ["all", "matched", "unmatched"].includes(filter)
            ? (filter as "all" | "matched" | "unmatched")
            : "all";

        const { entries, total } = await InboxService.getInboxEntries(req.user.id, {
            page,
            limit,
            filter: validFilter,
            search
        });

        paginated(
            res,
            entries,
            "Inbox entries retrieved successfully",
            page,
            limit,
            total,
            req.originalUrl
        );
    }
);

export const getInboxEntry = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const entry = await InboxService.getInboxEntry(req.user.id, req.params.id as string);

        success(
            res,
            "Inbox entry retrieved successfully",
            HttpStatus.OK,
            entry,
            req.originalUrl
        );
    }
);

export const linkToApplication = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const { applicationId } = req.body;

        if (!applicationId || typeof applicationId !== "string") {
            return res.status(HttpStatus.BAD_REQUEST).json({
                message: "applicationId is required",
                timestamp: new Date(),
                path: req.originalUrl
            });
        }

        const entry = await InboxService.linkToApplication(
            req.user.id,
            req.params.id as string,
            applicationId
        );

        success(
            res,
            "Inbox entry linked to application",
            HttpStatus.OK,
            entry,
            req.originalUrl
        );
    }
);

export const unlinkFromApplication = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const entry = await InboxService.unlinkFromApplication(req.user.id, req.params.id as string);

        success(
            res,
            "Inbox entry unlinked from application",
            HttpStatus.OK,
            entry,
            req.originalUrl
        );
    }
);
