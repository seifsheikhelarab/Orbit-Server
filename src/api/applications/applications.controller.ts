import type { Response } from "express";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import * as ApplicationsService from "./applications.service.js";
import {
    detachResumeFromApplication,
    getApplicationsResumeCounts,
    getResumesForApplication
} from "../resumes/resumes.service.js";
import { ResponseHandler, ErrorCode } from "../../utils/response.js";
import { getPagination } from "../../utils/pages.js";
import { HttpStatus } from "../../utils/response.js";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.js";
import { getApplicationsQuerySchema } from "./applications.schemas.js";

export const getApplications = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const queryResult = getApplicationsQuerySchema.safeParse(req.query);
        const parsedQuery = queryResult.success
            ? queryResult.data
            : {
                  page: 1,
                  limit: 20
              };

        const { page, limit } = getPagination(
            {
                page: String(parsedQuery.page),
                limit: String(parsedQuery.limit)
            },
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
            order: parsedQuery.order
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

export const getApplicationDocumentCountsHandler = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const applicationIds = req.query.ids as string;

        if (!applicationIds) {
            ResponseHandler.success(
                res,
                "Document counts retrieved successfully",
                HttpStatus.OK,
                {},
                req.originalUrl
            );
            return;
        }

        const ids = applicationIds.split(",");
        const counts = await getApplicationsResumeCounts(req.user.id, ids);

        ResponseHandler.success(
            res,
            "Document counts retrieved successfully",
            HttpStatus.OK,
            counts,
            req.originalUrl
        );
    }
);

export const getApplicationResumes = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const result = await getResumesForApplication(
            req.user.id,
            req.params.id as string
        );

        ResponseHandler.success(
            res,
            "Application resumes retrieved successfully",
            HttpStatus.OK,
            result,
            req.originalUrl
        );
    }
);

export const detachApplicationResume = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        await detachResumeFromApplication(
            req.user.id,
            req.params.attachmentId as string,
            req.params.id as string
        );

        ResponseHandler.success(
            res,
            "Resume detached from application",
            HttpStatus.OK,
            null,
            req.originalUrl
        );
    }
);

export const exportApplicationsCSV = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const rows = await ApplicationsService.exportApplicationsToCSV(req.user.id);

        const headers = [
            "id",
            "company",
            "jobTitle",
            "status",
            "location",
            "salaryMin",
            "salaryMax",
            "appliedDate",
            "source",
            "followUpDate",
            "notes",
            "createdAt"
        ];

        const csvRows = [
            headers.join(","),
            ...rows.map((row) =>
                [
                    row.id,
                    `"${(row.company || "").replace(/"/g, '""')}"`,
                    `"${(row.jobTitle || "").replace(/"/g, '""')}"`,
                    row.status,
                    `"${(row.location || "").replace(/"/g, '""')}"`,
                    row.salaryMin ?? "",
                    row.salaryMax ?? "",
                    row.appliedDate ?? "",
                    `"${(row.source || "").replace(/"/g, '""')}"`,
                    row.followUpDate ?? "",
                    `"${(row.notes || "").replace(/"/g, '""')}"`,
                    row.createdAt
                ].join(",")
            )
        ];

        const csvContent = csvRows.join("\n");
        const date = new Date().toISOString().split("T")[0];

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="applications_export_${date}.csv"`
        );
        return res.status(HttpStatus.OK).send(csvContent);
    }
);

export const bulkUpdateApplications = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const { ids, status } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return ResponseHandler.error(
                res,
                "ids must be a non-empty array",
                ErrorCode.VALIDATION_ERROR,
                HttpStatus.BAD_REQUEST,
                req.originalUrl
            );
        }

        const result = await ApplicationsService.bulkUpdateApplications(
            req.user.id,
            ids,
            status
        );

        ResponseHandler.success(
            res,
            "Applications updated successfully",
            HttpStatus.OK,
            result,
            req.originalUrl
        );
    }
);

export const bulkDeleteApplications = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return ResponseHandler.error(
                res,
                "ids must be a non-empty array",
                ErrorCode.VALIDATION_ERROR,
                HttpStatus.BAD_REQUEST,
                req.originalUrl
            );
        }

        const result = await ApplicationsService.bulkDeleteApplications(
            req.user.id,
            ids
        );

        ResponseHandler.success(
            res,
            "Applications deleted successfully",
            HttpStatus.OK,
            result,
            req.originalUrl
        );
    }
);

export const getAllApplicationIds = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const queryResult = getApplicationsQuerySchema.safeParse(req.query);
        const parsedQuery = queryResult.success
            ? queryResult.data
            : {};

        const ids = await ApplicationsService.getAllApplicationIds({
            userId: req.user.id,
            page: 1,
            limit: 10000,
            ...parsedQuery
        });

        ResponseHandler.success(
            res,
            "Application IDs retrieved successfully",
            HttpStatus.OK,
            { ids },
            req.originalUrl
        );
    }
);

export const getStatusHistory = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const result = await ApplicationsService.getStatusHistory(
            req.user.id,
            req.params.id as string
        );

        ResponseHandler.success(
            res,
            "Status history retrieved successfully",
            HttpStatus.OK,
            result,
            req.originalUrl
        );
    }
);

export const getContacts = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const result = await ApplicationsService.getContacts(
            req.user.id,
            req.params.id as string
        );

        ResponseHandler.success(
            res,
            "Contacts retrieved successfully",
            HttpStatus.OK,
            result,
            req.originalUrl
        );
    }
);

export const createContact = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const result = await ApplicationsService.createContact(
            req.user.id,
            req.params.id as string,
            req.body
        );

        ResponseHandler.success(
            res,
            "Contact created successfully",
            HttpStatus.CREATED,
            result,
            req.originalUrl
        );
    }
);

export const updateContact = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const result = await ApplicationsService.updateContact(
            req.user.id,
            req.params.id as string,
            req.params.contactId as string,
            req.body
        );

        ResponseHandler.success(
            res,
            "Contact updated successfully",
            HttpStatus.OK,
            result,
            req.originalUrl
        );
    }
);

export const deleteContact = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const result = await ApplicationsService.deleteContact(
            req.user.id,
            req.params.id as string,
            req.params.contactId as string
        );

        ResponseHandler.success(
            res,
            "Contact deleted successfully",
            HttpStatus.OK,
            result,
            req.originalUrl
        );
    }
);

export const getInterviewRounds = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const result = await ApplicationsService.getInterviewRounds(
            req.user.id,
            req.params.id as string
        );

        ResponseHandler.success(
            res,
            "Interview rounds retrieved successfully",
            HttpStatus.OK,
            result,
            req.originalUrl
        );
    }
);

export const createInterviewRound = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const result = await ApplicationsService.createInterviewRound(
            req.user.id,
            req.params.id as string,
            req.body
        );

        ResponseHandler.success(
            res,
            "Interview round created successfully",
            HttpStatus.CREATED,
            result,
            req.originalUrl
        );
    }
);

export const updateInterviewRound = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const result = await ApplicationsService.updateInterviewRound(
            req.user.id,
            req.params.id as string,
            req.params.roundId as string,
            req.body
        );

        ResponseHandler.success(
            res,
            "Interview round updated successfully",
            HttpStatus.OK,
            result,
            req.originalUrl
        );
    }
);

export const deleteInterviewRound = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const result = await ApplicationsService.deleteInterviewRound(
            req.user.id,
            req.params.id as string,
            req.params.roundId as string
        );

        ResponseHandler.success(
            res,
            "Interview round deleted successfully",
            HttpStatus.OK,
            result,
            req.originalUrl
        );
    }
);

export const getUpcomingInterviews = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const result = await ApplicationsService.getUpcomingInterviews(
            req.user.id
        );

        ResponseHandler.success(
            res,
            "Upcoming interviews retrieved successfully",
            HttpStatus.OK,
            result,
            req.originalUrl
        );
    }
);
