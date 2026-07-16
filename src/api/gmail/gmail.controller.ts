import type { Response } from "express";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import * as GmailService from "./gmail.service.js";
import { success, HttpStatus } from "../../utils/response.js";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.js";

export const connect = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const url = GmailService.getConnectUrl(req.user.id);
        success(res, "Gmail OAuth URL generated", HttpStatus.OK, { url }, req.originalUrl);
    }
);

export const callback = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const { code, state } = req.query as { code?: string; state?: string };

        if (!code) {
            return res.redirect(
                `${process.env.APP_BASE_URL || "http://localhost:5173"}/app/inbox?gmail=error&reason=missing_code`
            );
        }

        if (!state) {
            return res.redirect(
                `${process.env.APP_BASE_URL || "http://localhost:5173"}/app/inbox?gmail=error&reason=missing_state`
            );
        }

        await GmailService.handleCallback(state, code);

        return res.redirect(
            `${process.env.APP_BASE_URL || "http://localhost:5173"}/app/inbox?gmail=connected`
        );
    }
);

export const disconnect = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        await GmailService.disconnect(req.user.id);
        success(res, "Gmail disconnected", HttpStatus.OK, null, req.originalUrl);
    }
);

export const getStatus = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const status = await GmailService.getStatus(req.user.id);
        success(res, "Gmail status retrieved", HttpStatus.OK, status, req.originalUrl);
    }
);

export const resync = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        await GmailService.resync(req.user.id);
        success(res, "Gmail re-sync queued", HttpStatus.OK, null, req.originalUrl);
    }
);
