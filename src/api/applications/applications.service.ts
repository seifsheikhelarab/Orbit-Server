import prisma from "../../utils/prisma.js";
import { Prisma } from "../../generated/prisma/client.ts";
import { AppError, NotFoundError } from "../../utils/response.js";

export interface GetApplicationsParams {
    userId: string;
    page: number;
    limit: number;
    search?: string;
    status?: string;
    location?: string;
    applied_from?: string;
    applied_to?: string;
    salary_min?: number;
    salary_max?: number;
    sort?: string;
    order?: string;
}

type SortField = "company" | "jobTitle" | "applicationStatus" | "appliedDate" | "createdAt" | "updatedAt";

const sortableFields: SortField[] = ["company", "jobTitle", "applicationStatus", "appliedDate", "createdAt", "updatedAt"];

export async function getApplications(params: GetApplicationsParams) {
    try {
        const { userId, sort, order } = params;
        const page = params.page ?? 1;
        const limit = params.limit ?? 20;

        const where: Prisma.JobApplicationWhereInput = { userId };

        if (params.search) {
            const searchTerm = params.search.trim();
            if (searchTerm) {
                where.OR = [
                    { company: { contains: searchTerm, mode: "insensitive" } },
                    { jobTitle: { contains: searchTerm, mode: "insensitive" } },
                    { notes: { contains: searchTerm, mode: "insensitive" } },
                ];
            }
        }

        if (params.status) {
            const statuses = params.status.split(",").map((s) => s.trim()).filter(Boolean);
            if (statuses.length > 0) {
                where.applicationStatus = { in: statuses as Prisma.EnumapplicationStatusTypeFilter["in"] };
            }
        }

        if (params.location) {
            where.location = { contains: params.location, mode: "insensitive" };
        }

        if (params.applied_from || params.applied_to) {
            where.appliedDate = {};
            if (params.applied_from) {
                where.appliedDate.gte = new Date(params.applied_from);
            }
            if (params.applied_to) {
                where.appliedDate.lte = new Date(params.applied_to);
            }
            if (!where.appliedDate.gte && !where.appliedDate.lte) {
                delete where.appliedDate;
            }
        }

        if (params.salary_min !== undefined || params.salary_max !== undefined) {
            where.AND = where.AND || [];
            if (params.salary_min !== undefined) {
                (where.AND as Prisma.JobApplicationWhereInput[]).push({
                    OR: [
                        { salaryMax: { gte: params.salary_min } },
                        { salaryMax: null },
                    ],
                });
            }
            if (params.salary_max !== undefined) {
                (where.AND as Prisma.JobApplicationWhereInput[]).push({
                    OR: [
                        { salaryMin: { lte: params.salary_max } },
                        { salaryMin: null },
                    ],
                });
            }
        }

        const orderBy: Prisma.JobApplicationOrderByWithRelationInput = {};
        const sortField: SortField = (sort && sortableFields.includes(sort as SortField)) ? sort as SortField : "updatedAt";
        const sortOrder = order === "asc" ? "asc" : "desc";
        orderBy[sortField] = sortOrder;

        const applications = await prisma.jobApplication.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy,
        });

        const total = await prisma.jobApplication.count({ where });

        return { applications, total };
    } catch (error: unknown) {
        if (error instanceof AppError) throw error;
        throw new AppError(`Failed to retrieve applications: ${error}`, 500, "SERVER_ERROR");
    }
}

export async function getApplicationDetails(userId: string, applicationId: string) {
    try {
        const application = await prisma.jobApplication.findUnique({
            where: { id: applicationId, userId }
        });

        if (!application) {
            throw new NotFoundError("Application not found");
        }

        return application;
    } catch (error: unknown) {
        if (error instanceof AppError) throw error;
        throw new AppError(`Failed to retrieve application details: ${error}`, 500, "SERVER_ERROR");
    }
}

export async function createApplication(userId: string, data: Omit<Prisma.JobApplicationUncheckedCreateInput, 'userId'>) {
    try {
        return await prisma.jobApplication.create({
            data: { ...data, userId }
        });
    } catch (error: unknown) {
        throw new AppError(`Failed to create application: ${error}`, 500, "SERVER_ERROR");
    }
}

export async function updateApplication(userId: string, applicationId: string, data: Prisma.JobApplicationUpdateInput) {
    try {
        const existing = await prisma.jobApplication.findUnique({
            where: { id: applicationId, userId }
        });

        if (!existing) {
            throw new NotFoundError("Application not found");
        }

        return await prisma.jobApplication.update({
            where: { id: applicationId },
            data
        });
    } catch (error: unknown) {
        if (error instanceof AppError) throw error;
        throw new AppError(`Failed to update application: ${error}`, 500, "SERVER_ERROR");
    }
}

export async function deleteApplication(userId: string, applicationId: string) {
    try {
        const existing = await prisma.jobApplication.findUnique({
            where: { id: applicationId, userId }
        });

        if (!existing) {
            throw new NotFoundError("Application not found");
        }

        return await prisma.jobApplication.delete({
            where: { id: applicationId }
        });
    } catch (error: unknown) {
        if (error instanceof AppError) throw error;
        throw new AppError(`Failed to delete application: ${error}`, 500, "SERVER_ERROR");
    }
}
