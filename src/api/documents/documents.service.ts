import prisma from "../../utils/prisma.js";
import {
    getStorageService,
    generateStorageKey
} from "../../utils/storage/index.js";
import { LocalStorageService } from "../../utils/storage/LocalStorageService.js";
import type {
    DocumentType,
    CreateDocumentInput,
    UpdateDocumentInput,
    GetDocumentsQuery
} from "./documents.schemas.js";
import { AppError } from "../../utils/response.js";
import { HttpStatus } from "../../utils/response.js";

export interface DocumentWithVersions {
    id: string;
    name: string;
    type: DocumentType;
    activeVersionId: string | null;
    versionCount: number;
    createdAt: Date;
    updatedAt: Date;
    versions?: {
        id: string;
        versionNumber: number;
        originalFilename: string;
        fileSizeBytes: number;
        mimeType: string;
        createdAt: Date;
    }[];
    activeVersion?: {
        id: string;
        versionNumber: number;
        originalFilename: string;
        fileSizeBytes: number;
        createdAt: Date;
    } | null;
}

export async function getDocuments(
    userId: string,
    query: GetDocumentsQuery
): Promise<{ documents: DocumentWithVersions[]; total: number }> {
    const where = {
        userId,
        deletedAt: null,
        ...(query.type && { type: query.type })
    };

    const [documents, total] = await Promise.all([
        prisma.document.findMany({
            where,
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            orderBy: { createdAt: "desc" },
            include: {
                versions: {
                    orderBy: { versionNumber: "desc" }
                }
            }
        }),
        prisma.document.count({ where })
    ]);

    const documentsWithVersions = documents.map((doc) => {
        const activeVersion = doc.versions.find(
            (v) => v.id === doc.activeVersionId
        );
        return {
            id: doc.id,
            name: doc.name,
            type: doc.type,
            activeVersionId: doc.activeVersionId,
            versionCount: doc.versions.length,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            activeVersion: activeVersion
                ? {
                      id: activeVersion.id,
                      versionNumber: activeVersion.versionNumber,
                      originalFilename: activeVersion.originalFilename,
                      fileSizeBytes: activeVersion.fileSizeBytes,
                      createdAt: activeVersion.createdAt
                  }
                : null
        };
    });

    return { documents: documentsWithVersions, total };
}

export async function getDocumentById(
    userId: string,
    documentId: string
): Promise<DocumentWithVersions> {
    const document = await prisma.document.findFirst({
        where: { id: documentId, userId, deletedAt: null },
        include: {
            versions: {
                orderBy: { versionNumber: "desc" }
            }
        }
    });

    if (!document) {
        throw new AppError(
            "Document not found",
            HttpStatus.NOT_FOUND,
            "NOT_FOUND"
        );
    }

    const activeVersion = document.versions.find(
        (v) => v.id === document.activeVersionId
    );

    return {
        id: document.id,
        name: document.name,
        type: document.type,
        activeVersionId: document.activeVersionId,
        versionCount: document.versions.length,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        versions: document.versions.map((v) => ({
            id: v.id,
            versionNumber: v.versionNumber,
            originalFilename: v.originalFilename,
            fileSizeBytes: v.fileSizeBytes,
            mimeType: v.mimeType,
            createdAt: v.createdAt
        })),
        activeVersion: activeVersion
            ? {
                  id: activeVersion.id,
                  versionNumber: activeVersion.versionNumber,
                  originalFilename: activeVersion.originalFilename,
                  fileSizeBytes: activeVersion.fileSizeBytes,
                  createdAt: activeVersion.createdAt
              }
            : null
    };
}

export async function createDocument(
    userId: string,
    data: CreateDocumentInput,
    file: {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
        size: number;
    }
): Promise<DocumentWithVersions> {
    const storageService = getStorageService();

    const document = await prisma.document.create({
        data: {
            userId,
            name: data.name,
            type: data.type
        }
    });

    const storageKey = generateStorageKey(
        userId,
        document.id,
        1,
        file.originalname
    );

    await storageService.upload(file.buffer, storageKey, file.mimetype);

    const version = await prisma.documentVersion.create({
        data: {
            documentId: document.id,
            versionNumber: 1,
            originalFilename: file.originalname,
            storageKey,
            mimeType: file.mimetype,
            fileSizeBytes: file.size
        }
    });

    const updatedDocument = await prisma.document.update({
        where: { id: document.id },
        data: { activeVersionId: version.id }
    });

    return {
        id: updatedDocument.id,
        name: updatedDocument.name,
        type: updatedDocument.type,
        activeVersionId: updatedDocument.activeVersionId,
        versionCount: 1,
        createdAt: updatedDocument.createdAt,
        updatedAt: updatedDocument.updatedAt,
        activeVersion: {
            id: version.id,
            versionNumber: version.versionNumber,
            originalFilename: version.originalFilename,
            fileSizeBytes: version.fileSizeBytes,
            createdAt: version.createdAt
        }
    };
}

export async function updateDocument(
    userId: string,
    documentId: string,
    data: UpdateDocumentInput
): Promise<DocumentWithVersions> {
    const document = await prisma.document.findFirst({
        where: { id: documentId, userId, deletedAt: null }
    });

    if (!document) {
        throw new AppError(
            "Document not found",
            HttpStatus.NOT_FOUND,
            "NOT_FOUND"
        );
    }

    await prisma.document.update({
        where: { id: documentId },
        data: {
            name: data.name,
            type: data.type,
            activeVersionId: data.activeVersionId
        }
    });

    return getDocumentById(userId, documentId);
}

export async function deleteDocument(
    userId: string,
    documentId: string
): Promise<void> {
    const document = await prisma.document.findFirst({
        where: { id: documentId, userId, deletedAt: null }
    });

    if (!document) {
        throw new AppError(
            "Document not found",
            HttpStatus.NOT_FOUND,
            "NOT_FOUND"
        );
    }

    const attachmentCount = await prisma.applicationDocument.count({
        where: {
            documentVersion: {
                documentId
            }
        }
    });

    if (attachmentCount > 0) {
        throw new AppError(
            `Cannot delete document attached to ${attachmentCount} application(s)`,
            HttpStatus.CONFLICT,
            "DOCUMENT_IN_USE"
        );
    }

    await prisma.document.update({
        where: { id: documentId },
        data: { deletedAt: new Date() }
    });
}

export async function uploadNewVersion(
    userId: string,
    documentId: string,
    file: {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
        size: number;
    }
): Promise<DocumentWithVersions> {
    const document = await prisma.document.findFirst({
        where: { id: documentId, userId, deletedAt: null }
    });

    if (!document) {
        throw new AppError(
            "Document not found",
            HttpStatus.NOT_FOUND,
            "NOT_FOUND"
        );
    }

    const latestVersion = await prisma.documentVersion.findFirst({
        where: { documentId },
        orderBy: { versionNumber: "desc" }
    });

    const newVersionNumber = (latestVersion?.versionNumber || 0) + 1;
    const storageService = getStorageService();

    const storageKey = generateStorageKey(
        userId,
        document.id,
        newVersionNumber,
        file.originalname
    );

    await storageService.upload(file.buffer, storageKey, file.mimetype);

    await prisma.documentVersion.create({
        data: {
            documentId: document.id,
            versionNumber: newVersionNumber,
            originalFilename: file.originalname,
            storageKey,
            mimeType: file.mimetype,
            fileSizeBytes: file.size
        }
    });

    return getDocumentById(userId, documentId);
}

export async function getDocumentVersionForDownload(
    userId: string,
    documentId: string,
    versionId: string
): Promise<{
    stream: NodeJS.ReadableStream;
    mimeType: string;
    filename: string;
}> {
    const document = await prisma.document.findFirst({
        where: { id: documentId, userId, deletedAt: null }
    });

    if (!document) {
        throw new AppError(
            "Document not found",
            HttpStatus.NOT_FOUND,
            "NOT_FOUND"
        );
    }

    const version = await prisma.documentVersion.findFirst({
        where: { id: versionId, documentId }
    });

    if (!version) {
        throw new AppError(
            "Version not found",
            HttpStatus.NOT_FOUND,
            "NOT_FOUND"
        );
    }

    const storageService = getStorageService();
    const stream = await storageService.getStream(version.storageKey);

    return {
        stream,
        mimeType: version.mimeType,
        filename: version.originalFilename
    };
}

export async function getDocumentVersionPath(
    userId: string,
    documentId: string,
    versionId: string
): Promise<{ filePath: string; mimeType: string }> {
    const document = await prisma.document.findFirst({
        where: { id: documentId, userId, deletedAt: null }
    });

    if (!document) {
        throw new AppError(
            "Document not found",
            HttpStatus.NOT_FOUND,
            "NOT_FOUND"
        );
    }

    const version = await prisma.documentVersion.findFirst({
        where: { id: versionId, documentId }
    });

    if (!version) {
        throw new AppError(
            "Version not found",
            HttpStatus.NOT_FOUND,
            "NOT_FOUND"
        );
    }

    const storageService = getStorageService() as LocalStorageService;
    const filePath = storageService.getFilePath(version.storageKey);

    return {
        filePath,
        mimeType: version.mimeType
    };
}

export async function getDocumentVersionBuffer(
    userId: string,
    documentId: string,
    versionId: string
): Promise<{ buffer: Buffer; mimeType: string }> {
    const document = await prisma.document.findFirst({
        where: { id: documentId, userId, deletedAt: null }
    });

    if (!document) {
        throw new AppError(
            "Document not found",
            HttpStatus.NOT_FOUND,
            "NOT_FOUND"
        );
    }

    const version = await prisma.documentVersion.findFirst({
        where: { id: versionId, documentId }
    });

    if (!version) {
        throw new AppError(
            "Version not found",
            HttpStatus.NOT_FOUND,
            "NOT_FOUND"
        );
    }

    const storageService = getStorageService();
    const stream = await storageService.getStream(version.storageKey);

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    return {
        buffer,
        mimeType: version.mimeType
    };
}
