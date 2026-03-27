import type { Response } from "express";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import { ResponseHandler } from "../../utils/response.js";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.js";
import { analyticsQuerySchema } from "./analytics.schemas.js";
import * as AnalyticsService from "./analytics.service.js";

export const getSummary = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const queryResult = analyticsQuerySchema.safeParse(req.query);
        const query = queryResult.success ? queryResult.data : {};

        const stats = await AnalyticsService.getSummaryStats(req.user.id, query);

        ResponseHandler.success(
            res,
            "Summary stats retrieved successfully",
            200,
            stats,
            req.originalUrl
        );
    }
);

export const getApplicationsOverTime = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const queryResult = analyticsQuerySchema.safeParse(req.query);
        const query = queryResult.success ? queryResult.data : {};

        const data = await AnalyticsService.getApplicationsOverTime(
            req.user.id,
            query
        );

        ResponseHandler.success(
            res,
            "Applications over time retrieved successfully",
            200,
            data,
            req.originalUrl
        );
    }
);

export const getPipelineFunnel = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const queryResult = analyticsQuerySchema.safeParse(req.query);
        const query = queryResult.success ? queryResult.data : {};

        const data = await AnalyticsService.getPipelineFunnel(req.user.id, query);

        ResponseHandler.success(
            res,
            "Pipeline funnel retrieved successfully",
            200,
            data,
            req.originalUrl
        );
    }
);

export const getStatusBreakdown = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const data = await AnalyticsService.getStatusBreakdown(req.user.id);

        ResponseHandler.success(
            res,
            "Status breakdown retrieved successfully",
            200,
            data,
            req.originalUrl
        );
    }
);

export const getResponseRateTrend = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const queryResult = analyticsQuerySchema.safeParse(req.query);
        const query = queryResult.success ? queryResult.data : {};

        const data = await AnalyticsService.getResponseRateTrend(
            req.user.id,
            query
        );

        ResponseHandler.success(
            res,
            "Response rate trend retrieved successfully",
            200,
            data,
            req.originalUrl
        );
    }
);

export const getTopLocations = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const data = await AnalyticsService.getTopLocations(req.user.id);

        ResponseHandler.success(
            res,
            "Top locations retrieved successfully",
            200,
            data,
            req.originalUrl
        );
    }
);

export const getSourceBreakdown = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const data = await AnalyticsService.getSourceBreakdown(req.user.id);

        ResponseHandler.success(
            res,
            "Source breakdown retrieved successfully",
            200,
            data,
            req.originalUrl
        );
    }
);
