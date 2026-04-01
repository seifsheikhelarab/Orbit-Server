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
    const where = { userId };

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
