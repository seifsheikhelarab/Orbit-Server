import type { Response } from "express";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import { ResponseHandler, HttpStatus } from "../../utils/response.js";
import * as ResumesService from "./resumes.service.js";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.js";
import type { GetResumesQuery } from "./resumes.schemas.js";

export const getResumes = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const query = req.query as unknown as GetResumesQuery;
        const { resumes, total } = await ResumesService.getResumes(
            req.user.id,
            query
        );

        ResponseHandler.paginated(
            res,
            resumes,
            "Resumes retrieved successfully",
            query.page,
            query.limit,
            total,
            req.originalUrl
        );
    }
);

export const getResumeById = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const resume = await ResumesService.getResumeById(
            req.user.id,
            req.params.id as string
        );

        ResponseHandler.success(
            res,
            "Resume retrieved successfully",
            HttpStatus.OK,
            resume,
            req.originalUrl
        );
    }
);

export const createResume = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const resume = await ResumesService.createResume(
            req.user.id,
            req.body
        );

        ResponseHandler.success(
            res,
            "Resume created successfully",
            HttpStatus.CREATED,
            resume,
            req.originalUrl
        );
    }
);

export const updateResume = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const resume = await ResumesService.updateResume(
            req.user.id,
            req.params.id as string,
            req.body
        );

        ResponseHandler.success(
            res,
            "Resume updated successfully",
            HttpStatus.OK,
            resume,
            req.originalUrl
        );
    }
);

export const deleteResume = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        await ResumesService.deleteResume(
            req.user.id,
            req.params.id as string
        );

        ResponseHandler.success(
            res,
            "Resume deleted successfully",
            HttpStatus.OK,
            null,
            req.originalUrl
        );
    }
);
