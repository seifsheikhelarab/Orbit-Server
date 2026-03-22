import type { Response } from "express";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import * as ApplicationsService from "./applications.service.js";
import { ResponseHandler } from "../../utils/response.js";
import { getPagination } from "../../utils/pages.js";
import { HttpStatus } from "../../utils/response.js";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.js";
import { getApplicationsQuerySchema } from "./applications.schemas.js";

export const getApplications = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const queryResult = getApplicationsQuerySchema.safeParse(req.query);
        const parsedQuery = queryResult.success ? queryResult.data : {
            page: 1,
            limit: 20,
        };

        const { page, limit } = getPagination(
            { page: String(parsedQuery.page), limit: String(parsedQuery.limit) },
            20
        );

        const result = await ApplicationsService.getApplications({
            userId: req.user.id,
            page,
            limit,
            search: parsedQuery.search,
            status: parsedQuery.status,
            location: parsedQuery.location,
            applied_from: parsedQuery.applied_from,
            applied_to: parsedQuery.applied_to,
            salary_min: parsedQuery.salary_min,
            salary_max: parsedQuery.salary_max,
            sort: parsedQuery.sort,
            order: parsedQuery.order,
        });

        ResponseHandler.paginated(
            res,
            result.applications,
            "Applications retrieved successfully",
            page,
            limit,
            result.total,
            req.originalUrl
        );
    }
);

export const createApplication = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const result = await ApplicationsService.createApplication(
            req.user.id,
            req.body
        );

        ResponseHandler.success(
            res,
            "Application created successfully",
            HttpStatus.CREATED,
            result,
            req.originalUrl
        );
    }
);

export const getApplicationDetails = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const result = await ApplicationsService.getApplicationDetails(
            req.user.id,
            req.params.id as string
        );

        ResponseHandler.success(
            res,
            "Application retrieved successfully",
            HttpStatus.OK,
            result,
            req.originalUrl
        );
    }
);

export const updateApplication = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const result = await ApplicationsService.updateApplication(
            req.user.id,
            req.params.id as string,
            req.body
        );

        ResponseHandler.success(
            res,
            "Application updated successfully",
            HttpStatus.OK,
            result,
            req.originalUrl
        );
    }
);

export const deleteApplication = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const result = await ApplicationsService.deleteApplication(
            req.user.id,
            req.params.id as string
        );

        ResponseHandler.success(
            res,
            "Application deleted successfully",
            HttpStatus.OK,
            result,
            req.originalUrl
        );
    }
);
