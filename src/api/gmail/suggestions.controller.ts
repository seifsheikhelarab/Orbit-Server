import type { Response } from "express";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import * as SuggestionsService from "./suggestions.service.js";
import { success, paginated, HttpStatus } from "../../utils/response.js";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.js";

export const getSuggestions = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
        const status = (req.query.status as string) || undefined;
        const applicationId = (req.query.applicationId as string) || undefined;

        const result = await SuggestionsService.getSuggestions(req.user.id, { page, limit, status, applicationId });

        paginated(res, result.suggestions, "Suggestions retrieved", result.page, result.limit, result.total, req.originalUrl);
    }
);

export const getSuggestion = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const suggestion = await SuggestionsService.getSuggestion(req.user.id, req.params.id as string);
        success(res, "Suggestion retrieved", HttpStatus.OK, suggestion, req.originalUrl);
    }
);

export const acceptSuggestion = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const result = await SuggestionsService.acceptSuggestion(req.user.id, req.params.id as string);
        success(res, "Suggestion accepted", HttpStatus.OK, result, req.originalUrl);
    }
);

export const dismissSuggestion = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const result = await SuggestionsService.dismissSuggestion(req.user.id, req.params.id as string);
        success(res, "Suggestion dismissed", HttpStatus.OK, result, req.originalUrl);
    }
);
