import prisma from "../../utils/prisma.js";
import { AppError } from "../../utils/response.js";
import { HttpStatus } from "../../utils/response.js";

export interface AttachedDocument {
    id: string;
    documentId: string;
    documentName: string;
    documentType: string;
    versionId: string;
    versionNumber: number;
    originalFilename: string;
    fileSizeBytes: number;
    mimeType: string;
    attachedAt: Date;
}

export async function getAttachedDocuments(
    userId: string,
    applicationId: string
): Promise<AttachedDocument[]> {
    const application = await prisma.jobApplication.findFirst({
        where: { id: applicationId, userId }
    });

    if (!application) {
        throw new AppError(
            "Application not found",
            HttpStatus.NOT_FOUND,
            "NOT_FOUND"
        );
    }

    const attachments = await prisma.applicationDocument.findMany({
        where: { applicationId },
        include: {
            documentVersion: {
                include: {
                    document: true
                }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    return attachments.map((att) => ({
        id: att.id,
        documentId: att.documentVersion.document.id,
        documentName: att.documentVersion.document.name,
        documentType: att.documentVersion.document.type,
        versionId: att.documentVersion.id,
        versionNumber: att.documentVersion.versionNumber,
        originalFilename: att.documentVersion.originalFilename,
        fileSizeBytes: att.documentVersion.fileSizeBytes,
        mimeType: att.documentVersion.mimeType,
        attachedAt: att.createdAt
    }));
}

export async function attachDocument(
    userId: string,
    applicationId: string,
    documentVersionId: string
): Promise<AttachedDocument> {
    const application = await prisma.jobApplication.findFirst({
        where: { id: applicationId, userId }
    });

    if (!application) {
        throw new AppError(
            "Application not found",
            HttpStatus.NOT_FOUND,
            "NOT_FOUND"
        );
    }

    const version = await prisma.documentVersion.findFirst({
        where: {
            id: documentVersionId,
            document: {
                userId,
                deletedAt: null
            }
        },
        include: {
            document: true
        }
    });

    if (!version) {
        throw new AppError(
            "Document version not found",
            HttpStatus.NOT_FOUND,
            "NOT_FOUND"
        );
    }

    const existing = await prisma.applicationDocument.findUnique({
        where: {
            applicationId_documentVersionId: {
                applicationId,
                documentVersionId
            }
        }
    });

    if (existing) {
        throw new AppError(
            "Document version already attached to this application",
            HttpStatus.CONFLICT,
            "DUPLICATE_ATTACHMENT"
        );
    }

    const attachment = await prisma.applicationDocument.create({
        data: {
            applicationId,
            documentVersionId
        },
        include: {
            documentVersion: true
        }
    });

    return {
        id: attachment.id,
        documentId: version.document.id,
        documentName: version.document.name,
        documentType: version.document.type,
        versionId: version.id,
        versionNumber: version.versionNumber,
        originalFilename: version.originalFilename,
        fileSizeBytes: version.fileSizeBytes,
        mimeType: version.mimeType,
        attachedAt: attachment.createdAt
    };
}

export async function detachDocument(
    userId: string,
    applicationId: string,
    attachmentId: string
): Promise<void> {
    const application = await prisma.jobApplication.findFirst({
        where: { id: applicationId, userId }
    });

    if (!application) {
        throw new AppError(
            "Application not found",
            HttpStatus.NOT_FOUND,
            "NOT_FOUND"
        );
    }

    const attachment = await prisma.applicationDocument.findFirst({
        where: {
            id: attachmentId,
            applicationId
        }
    });

    if (!attachment) {
        throw new AppError(
            "Attachment not found",
            HttpStatus.NOT_FOUND,
            "NOT_FOUND"
        );
    }

    await prisma.applicationDocument.delete({
        where: { id: attachmentId }
    });
}

export async function getApplicationDocumentCount(
    userId: string,
    applicationId: string
): Promise<number> {
    const application = await prisma.jobApplication.findFirst({
        where: { id: applicationId, userId }
    });

    if (!application) {
        return 0;
    }

    return prisma.applicationDocument.count({
        where: { applicationId }
    });
}

export async function getApplicationsDocumentCounts(
    userId: string,
    applicationIds: string[]
): Promise<Record<string, number>> {
    const counts = await prisma.applicationDocument.groupBy({
        by: ["applicationId"],
        where: {
            applicationId: { in: applicationIds },
            application: {
                userId
            }
        },
        _count: {
            id: true
        }
    });

    return counts.reduce(
        (acc, { applicationId, _count }) => {
            acc[applicationId] = _count.id;
            return acc;
        },
        {} as Record<string, number>
    );
}
