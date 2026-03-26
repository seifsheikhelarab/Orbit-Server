import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import * as DocumentsService from "./documents.service.js";
import {
    ResponseHandler,
    HttpStatus,
    ErrorCode
} from "../../utils/response.js";
import { getPagination } from "../../utils/pages.js";
import {
    createDocumentSchema,
    updateDocumentSchema,
    getDocumentsQuerySchema
} from "./documents.schemas.js";

export const getDocuments = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const queryResult = getDocumentsQuerySchema.safeParse(req.query);
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

        const result = await DocumentsService.getDocuments(req.user.id, {
            ...parsedQuery,
            page,
            limit
        });

        ResponseHandler.paginated(
            res,
            result.documents,
            "Documents retrieved successfully",
            page,
            limit,
            result.total,
            req.originalUrl
        );
    }
);

export const getDocumentById = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const documentId = req.params.id as string;
        const document = await DocumentsService.getDocumentById(
            req.user.id,
            documentId
        );

        ResponseHandler.success(
            res,
            "Document retrieved successfully",
            HttpStatus.OK,
            document,
            req.originalUrl
        );
    }
);

export const createDocument = asyncHandler(
    async (
        req: AuthenticatedRequest & { file?: Express.Multer.File },
        res: Response
    ) => {
        const result = createDocumentSchema.safeParse(req.body);
        if (!result.success) {
            ResponseHandler.error(
                res,
                "Invalid request data",
                ErrorCode.VALIDATION_ERROR,
                HttpStatus.BAD_REQUEST
            );
            return;
        }

        if (!req.file) {
            ResponseHandler.error(
                res,
                "No file uploaded",
                ErrorCode.VALIDATION_ERROR,
                HttpStatus.BAD_REQUEST
            );
            return;
        }

        const document = await DocumentsService.createDocument(
            req.user.id,
            result.data,
            {
                buffer: req.file.buffer,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            }
        );

        ResponseHandler.success(
            res,
            "Document created successfully",
            HttpStatus.CREATED,
            document,
            req.originalUrl
        );
    }
);

export const updateDocument = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const result = updateDocumentSchema.safeParse(req.body);
        if (!result.success) {
            ResponseHandler.error(
                res,
                "Invalid request data",
                ErrorCode.VALIDATION_ERROR,
                HttpStatus.BAD_REQUEST
            );
            return;
        }

        const documentId = req.params.id as string;
        const document = await DocumentsService.updateDocument(
            req.user.id,
            documentId,
            result.data
        );

        ResponseHandler.success(
            res,
            "Document updated successfully",
            HttpStatus.OK,
            document,
            req.originalUrl
        );
    }
);

export const deleteDocument = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const documentId = req.params.id as string;
        await DocumentsService.deleteDocument(req.user.id, documentId);

        ResponseHandler.success(
            res,
            "Document deleted successfully",
            HttpStatus.OK,
            null,
            req.originalUrl
        );
    }
);

export const uploadNewVersion = asyncHandler(
    async (
        req: AuthenticatedRequest & { file?: Express.Multer.File },
        res: Response
    ) => {
        if (!req.file) {
            ResponseHandler.error(
                res,
                "No file uploaded",
                ErrorCode.VALIDATION_ERROR,
                HttpStatus.BAD_REQUEST
            );
            return;
        }

        const documentId = req.params.id as string;
        const document = await DocumentsService.uploadNewVersion(
            req.user.id,
            documentId,
            {
                buffer: req.file.buffer,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            }
        );

        ResponseHandler.success(
            res,
            "New version uploaded successfully",
            HttpStatus.CREATED,
            document,
            req.originalUrl
        );
    }
);

export const downloadVersion = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const documentId = req.params.id as string;
        const versionId = req.params.versionId as string;

        const { stream, mimeType, filename } =
            await DocumentsService.getDocumentVersionForDownload(
                req.user.id,
                documentId,
                versionId
            );

        res.setHeader("Content-Type", mimeType);
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${encodeURIComponent(filename)}"`
        );

        res.flushHeaders();
        stream.pipe(res);
    }
);

export const previewVersion = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const documentId = req.params.id as string;
        const versionId = req.params.versionId as string;

        const { buffer, mimeType } =
            await DocumentsService.getDocumentVersionBuffer(
                req.user.id,
                documentId,
                versionId
            );

        res.setHeader("Content-Type", mimeType);
        res.setHeader("Content-Disposition", "inline");
        res.send(buffer);
    }
);
