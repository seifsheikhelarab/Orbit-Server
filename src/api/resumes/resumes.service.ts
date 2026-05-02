import prisma from "../../utils/prisma.js";
import { AppError, HttpStatus } from "../../utils/response.js";
import type {
    CreateResumeInput,
    UpdateResumeInput,
    GetResumesQuery
} from "./resumes.schemas.js";

export async function getResumes(
    userId: string,
    query: GetResumesQuery
) {
    const where: any = { userId };
    
    if (query.type) {
        where.type = query.type;
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const [resumes, total] = await Promise.all([
        prisma.resume.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { updatedAt: "desc" }
        }),
        prisma.resume.count({ where })
    ]);

    return { resumes, total };
}

export async function getResumeById(userId: string, resumeId: string) {
    const resume = await prisma.resume.findFirst({
        where: { id: resumeId, userId }
    });

    if (!resume) {
        throw new AppError(
            "Resume not found",
            HttpStatus.NOT_FOUND,
            "NOT_FOUND"
        );
    }

    return resume;
}

export async function createResume(
    userId: string,
    data: CreateResumeInput
) {
    try {
        const resume = await prisma.resume.create({
            data: {
                userId,
                name: data.name,
                type: data.type || "RESUME",
                slug: data.slug || undefined,
                content: data.content as any,
                settings: data.settings as any,
                isPublic: data.isPublic ?? false
            }
        });

        return resume;
    } catch (error: any) {
        if (error.code === 'P2002') {
            throw new AppError("Slug already in use", HttpStatus.CONFLICT, "CONFLICT");
        }
        throw error;
    }
}

export async function updateResume(
    userId: string,
    resumeId: string,
    data: UpdateResumeInput
) {
    const existing = await prisma.resume.findFirst({
        where: { id: resumeId, userId }
    });

    if (!existing) {
        throw new AppError(
            "Resume not found",
            HttpStatus.NOT_FOUND,
            "NOT_FOUND"
        );
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.settings !== undefined) updateData.settings = data.settings;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;

    try {
        const updated = await prisma.resume.update({
            where: { id: resumeId, userId },
            data: updateData
        });
        return updated;
    } catch (error: any) {
        if (error.code === 'P2002') {
            throw new AppError("Slug already in use", HttpStatus.CONFLICT, "CONFLICT");
        }
        throw error;
    }
}

export async function deleteResume(userId: string, resumeId: string) {
    const existing = await prisma.resume.findFirst({
        where: { id: resumeId, userId }
    });

    if (!existing) {
        throw new AppError(
            "Resume not found",
            HttpStatus.NOT_FOUND,
            "NOT_FOUND"
        );
    }

    await prisma.resume.delete({
        where: { id: resumeId, userId }
    });
}

export async function attachResumeToApplication(
    userId: string,
    resumeId: string,
    applicationId: string
) {
    const resume = await prisma.resume.findFirst({
        where: { id: resumeId, userId }
    });

    if (!resume) {
        throw new AppError("Resume not found", HttpStatus.NOT_FOUND, "NOT_FOUND");
    }

    const application = await prisma.jobApplication.findFirst({
        where: { id: applicationId, userId }
    });

    if (!application) {
        throw new AppError("Application not found", HttpStatus.NOT_FOUND, "NOT_FOUND");
    }

    const existing = await prisma.applicationResume.findFirst({
        where: { applicationId, resumeId }
    });

    if (existing) {
        return existing;
    }

    return prisma.applicationResume.create({
        data: { applicationId, resumeId }
    });
}

export async function getResumesForApplication(userId: string, applicationId: string) {
    const application = await prisma.jobApplication.findFirst({
        where: { id: applicationId, userId }
    });

    if (!application) {
        throw new AppError("Application not found", HttpStatus.NOT_FOUND, "NOT_FOUND");
    }

    const attachments = await prisma.applicationResume.findMany({
        where: { applicationId },
        include: { resume: true },
        orderBy: { createdAt: "desc" }
    });

    return attachments;
}

export async function detachResumeFromApplication(
    userId: string,
    attachmentId: string,
    applicationId: string
) {
    const attachment = await prisma.applicationResume.findFirst({
        where: { id: attachmentId, applicationId },
        include: { application: true }
    });

    if (!attachment) {
        throw new AppError("Attachment not found", HttpStatus.NOT_FOUND, "NOT_FOUND");
    }

    if (attachment.application.userId !== userId) {
        throw new AppError("Not found", HttpStatus.NOT_FOUND, "NOT_FOUND");
    }

    await prisma.applicationResume.delete({
        where: { id: attachmentId }
    });
}

export async function getApplicationsResumeCounts(
    userId: string,
    applicationIds: string[]
): Promise<Record<string, number>> {
    const counts = await prisma.applicationResume.groupBy({
        by: ["applicationId"],
        where: {
            applicationId: { in: applicationIds },
            resume: {
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
