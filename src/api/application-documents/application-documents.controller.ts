import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import * as ApplicationDocumentsService from "./application-documents.service.js";
import {
    ResponseHandler,
    HttpStatus,
    ErrorCode
} from "../../utils/response.js";

export const getAttachedDocuments = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const applicationId = req.params.id as string;
        const documents =
            await ApplicationDocumentsService.getAttachedDocuments(
                req.user.id,
                applicationId
            );

        ResponseHandler.success(
            res,
            "Attached documents retrieved successfully",
            HttpStatus.OK,
            documents,
            req.originalUrl
        );
    }
);

export const attachDocument = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const body = req.body as { documentVersionId?: unknown };
        const documentVersionId = body.documentVersionId as string;

        if (!documentVersionId) {
            ResponseHandler.error(
                res,
                "documentVersionId is required",
                ErrorCode.VALIDATION_ERROR,
                HttpStatus.BAD_REQUEST
            );
            return;
        }

        const applicationId = req.params.id as string;
        const document = await ApplicationDocumentsService.attachDocument(
            req.user.id,
            applicationId,
            documentVersionId
        );

        ResponseHandler.success(
            res,
            "Document attached successfully",
            HttpStatus.CREATED,
            document,
            req.originalUrl
        );
    }
);

export const detachDocument = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const applicationId = req.params.id as string;
        const attachmentId = req.params.attachmentId as string;

        await ApplicationDocumentsService.detachDocument(
            req.user.id,
            applicationId,
            attachmentId
        );

        ResponseHandler.success(
            res,
            "Document detached successfully",
            HttpStatus.OK,
            null,
            req.originalUrl
        );
    }
);
