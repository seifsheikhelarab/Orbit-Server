import prisma from "../../utils/prisma.js";
import { Prisma } from "../../generated/prisma/client.ts";
import { AppError, NotFoundError } from "../../utils/response.js";
import {
    cacheGet,
    cacheSet,
    cacheDelete,
    cacheDeletePattern,
    generateCacheKey
} from "../../utils/cache.js";

const APPLICATION_CACHE_TTL = 120;
const DETAILS_CACHE_TTL = 300;

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

type SortField =
    | "company"
    | "jobTitle"
    | "applicationStatus"
    | "appliedDate"
    | "createdAt"
    | "updatedAt";

const sortableFields: SortField[] = [
    "company",
    "jobTitle",
    "applicationStatus",
    "appliedDate",
    "createdAt",
    "updatedAt"
];

export async function getApplications(params: GetApplicationsParams) {
    try {
        const { userId, sort, order } = params;
        const page = params.page ?? 1;
        const limit = params.limit ?? 20;

        const cacheKey = generateCacheKey(
            "applications:list",
            userId,
            String(page),
            String(limit),
            params.search || "no-search",
            params.status || "no-status",
            params.sort || "no-sort"
        );

        if (page === 1) {
            const cached = await cacheGet<{
                applications: unknown[];
                total: number;
            }>(cacheKey);
            if (cached) {
                return {
                    applications: cached.applications as never[],
                    total: cached.total
                };
            }
        }

        const where: Prisma.JobApplicationWhereInput = { userId };

        if (params.search) {
            const searchTerm = params.search.trim();
            if (searchTerm) {
                where.OR = [
                    { company: { contains: searchTerm, mode: "insensitive" } },
                    { jobTitle: { contains: searchTerm, mode: "insensitive" } },
                    { notes: { contains: searchTerm, mode: "insensitive" } }
                ];
            }
        }

        if (params.status) {
            const statuses = params.status
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
            if (statuses.length > 0) {
                where.applicationStatus = {
                    in: statuses as Prisma.EnumapplicationStatusTypeFilter["in"]
                };
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

        if (
            params.salary_min !== undefined ||
            params.salary_max !== undefined
        ) {
            where.AND = where.AND || [];
            if (params.salary_min !== undefined) {
                (where.AND as Prisma.JobApplicationWhereInput[]).push({
                    OR: [
                        { salaryMax: { gte: params.salary_min } },
                        { salaryMax: null }
                    ]
                });
            }
            if (params.salary_max !== undefined) {
                (where.AND as Prisma.JobApplicationWhereInput[]).push({
                    OR: [
                        { salaryMin: { lte: params.salary_max } },
                        { salaryMin: null }
                    ]
                });
            }
        }

        const orderBy: Prisma.JobApplicationOrderByWithRelationInput = {};
        const sortField: SortField =
            sort && sortableFields.includes(sort as SortField)
                ? (sort as SortField)
                : "updatedAt";
        const sortOrder = order === "asc" ? "asc" : "desc";
        orderBy[sortField] = sortOrder;

        const applications = await prisma.jobApplication.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy
        });

        const total = await prisma.jobApplication.count({ where });

        if (page === 1) {
            await cacheSet(
                cacheKey,
                { applications, total },
                APPLICATION_CACHE_TTL
            );
        }

        return { applications, total };
    } catch (error: unknown) {
        if (error instanceof AppError) throw error;
        throw new AppError(
            `Failed to retrieve applications: ${error}`,
            500,
            "SERVER_ERROR"
        );
    }
}

export async function getAllApplicationIds(params: GetApplicationsParams) {
    const where: Prisma.JobApplicationWhereInput = { userId: params.userId };

    if (params.search) {
        where.OR = [
            { company: { contains: params.search, mode: "insensitive" } },
            { jobTitle: { contains: params.search, mode: "insensitive" } },
            { notes: { contains: params.search, mode: "insensitive" } }
        ];
    }

    if (params.status) {
        const statuses = params.status.split(",");
        if (statuses.length > 0) {
            where.applicationStatus = {
                in: statuses as Prisma.EnumapplicationStatusTypeFilter["in"]
            };
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
                    { salaryMax: null }
                ]
            });
        }
        if (params.salary_max !== undefined) {
            (where.AND as Prisma.JobApplicationWhereInput[]).push({
                OR: [
                    { salaryMin: { lte: params.salary_max } },
                    { salaryMin: null }
                ]
            });
        }
    }

    const applications = await prisma.jobApplication.findMany({
        where,
        select: { id: true }
    });

    return applications.map((app) => app.id);
}

export async function getApplicationDetails(
    userId: string,
    applicationId: string
) {
    try {
        const cacheKey = generateCacheKey(
            "applications:detail",
            userId,
            applicationId
        );

        const cached = await cacheGet<unknown>(cacheKey);
        if (cached) {
            return cached as never;
        }

        const application = await prisma.jobApplication.findUnique({
            where: { id: applicationId, userId }
        });

        if (!application) {
            throw new NotFoundError("Application not found");
        }

        await cacheSet(cacheKey, application, DETAILS_CACHE_TTL);

        return application;
    } catch (error: unknown) {
        if (error instanceof AppError) throw error;
        throw new AppError(
            `Failed to retrieve application details: ${error}`,
            500,
            "SERVER_ERROR"
        );
    }
}

export async function createApplication(
    userId: string,
    data: Omit<Prisma.JobApplicationUncheckedCreateInput, "userId">
) {
    try {
        const result = await prisma.jobApplication.create({
            data: { ...data, userId }
        });

        await cacheDeletePattern(`applications:list:${userId}:*`);

        return result;
    } catch (error: unknown) {
        throw new AppError(
            `Failed to create application: ${error}`,
            500,
            "SERVER_ERROR"
        );
    }
}

export async function updateApplication(
    userId: string,
    applicationId: string,
    data: Prisma.JobApplicationUpdateInput
) {
    try {
        const existing = await prisma.jobApplication.findUnique({
            where: { id: applicationId, userId }
        });

        if (!existing) {
            throw new NotFoundError("Application not found");
        }

        const newStatus = (data.applicationStatus as unknown as { toString(): string })?.toString();
        
        const result = await prisma.jobApplication.update({
            where: { id: applicationId },
            data
        });

        if (newStatus && newStatus !== existing.applicationStatus) {
            await prisma.statusHistory.create({
                data: {
                    applicationId,
                    fromStatus: existing.applicationStatus,
                    toStatus: result.applicationStatus
                }
            });
        }

        await cacheDelete(
            generateCacheKey("applications:detail", userId, applicationId)
        );
        await cacheDeletePattern(`applications:list:${userId}:*`);

        return result;
    } catch (error: unknown) {
        if (error instanceof AppError) throw error;
        throw new AppError(
            `Failed to update application: ${error}`,
            500,
            "SERVER_ERROR"
        );
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

        const result = await prisma.jobApplication.delete({
            where: { id: applicationId }
        });

        await cacheDelete(
            generateCacheKey("applications:detail", userId, applicationId)
        );
        await cacheDeletePattern(`applications:list:${userId}:*`);

        return result;
    } catch (error: unknown) {
        if (error instanceof AppError) throw error;
        throw new AppError(
            `Failed to delete application: ${error}`,
            500,
            "SERVER_ERROR"
        );
    }
}

export interface ApplicationCSVRow {
    id: string;
    company: string;
    jobTitle: string;
    status: string;
    location: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    appliedDate: string | null;
    source: string | null;
    followUpDate: string | null;
    notes: string | null;
    createdAt: string;
}

export async function exportApplicationsToCSV(userId: string): Promise<ApplicationCSVRow[]> {
    try {
        const applications = await prisma.jobApplication.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                company: true,
                jobTitle: true,
                applicationStatus: true,
                location: true,
                salaryMin: true,
                salaryMax: true,
                appliedDate: true,
                source: true,
                followUpDate: true,
                notes: true,
                createdAt: true
            }
        });

        return applications.map((app) => ({
            id: app.id,
            company: app.company,
            jobTitle: app.jobTitle,
            status: app.applicationStatus,
            location: app.location,
            salaryMin: app.salaryMin,
            salaryMax: app.salaryMax,
            appliedDate: app.appliedDate?.toISOString().split("T")[0] ?? null,
            source: app.source,
            followUpDate: app.followUpDate?.toISOString().split("T")[0] ?? null,
            notes: app.notes,
            createdAt: app.createdAt.toISOString()
        }));
    } catch (error: unknown) {
        throw new AppError(
            `Failed to export applications: ${error}`,
            500,
            "SERVER_ERROR"
        );
    }
}

export async function bulkUpdateApplications(
    userId: string,
    ids: string[],
    status: string
) {
    const applications = await prisma.jobApplication.findMany({
        where: { id: { in: ids }, userId },
        select: { id: true }
    });

    if (applications.length !== ids.length) {
        throw new AppError("Some applications not found or not owned by user", 403, "FORBIDDEN");
    }

    const result = await prisma.jobApplication.updateMany({
        where: { id: { in: ids } },
        data: { applicationStatus: status as never }
    });

    await cacheDeletePattern(`applications:list:${userId}:*`);
    for (const id of ids) {
        await cacheDelete(`applications:detail:${userId}:${id}`);
    }

    return result;
}

export async function bulkDeleteApplications(userId: string, ids: string[]) {
    const applications = await prisma.jobApplication.findMany({
        where: { id: { in: ids }, userId },
        select: { id: true }
    });

    if (applications.length !== ids.length) {
        throw new AppError("Some applications not found or not owned by user", 403, "FORBIDDEN");
    }

    const result = await prisma.jobApplication.deleteMany({
        where: { id: { in: ids } }
    });

    await cacheDeletePattern(`applications:list:${userId}:*`);
    for (const id of ids) {
        await cacheDelete(`applications:detail:${userId}:${id}`);
    }

    return result;
}

export async function getStatusHistory(userId: string, applicationId: string) {
    const application = await prisma.jobApplication.findFirst({
        where: { id: applicationId, userId }
    });

    if (!application) {
        throw new NotFoundError("Application not found");
    }

    return prisma.statusHistory.findMany({
        where: { applicationId },
        orderBy: { changedAt: "desc" }
    });
}

export interface ContactInput {
    name: string;
    title?: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
}

export async function getContacts(userId: string, applicationId: string) {
    const application = await prisma.jobApplication.findFirst({
        where: { id: applicationId, userId }
    });

    if (!application) {
        throw new NotFoundError("Application not found");
    }

    return prisma.contact.findMany({
        where: { applicationId },
        orderBy: { createdAt: "desc" }
    });
}

export async function createContact(
    userId: string,
    applicationId: string,
    data: ContactInput
) {
    const application = await prisma.jobApplication.findFirst({
        where: { id: applicationId, userId }
    });

    if (!application) {
        throw new NotFoundError("Application not found");
    }

    return prisma.contact.create({
        data: {
            ...data,
            applicationId
        }
    });
}

export async function updateContact(
    userId: string,
    applicationId: string,
    contactId: string,
    data: Partial<ContactInput>
) {
    const application = await prisma.jobApplication.findFirst({
        where: { id: applicationId, userId }
    });

    if (!application) {
        throw new NotFoundError("Application not found");
    }

    const contact = await prisma.contact.findFirst({
        where: { id: contactId, applicationId }
    });

    if (!contact) {
        throw new NotFoundError("Contact not found");
    }

    return prisma.contact.update({
        where: { id: contactId },
        data
    });
}

export async function deleteContact(
    userId: string,
    applicationId: string,
    contactId: string
) {
    const application = await prisma.jobApplication.findFirst({
        where: { id: applicationId, userId }
    });

    if (!application) {
        throw new NotFoundError("Application not found");
    }

    const contact = await prisma.contact.findFirst({
        where: { id: contactId, applicationId }
    });

    if (!contact) {
        throw new NotFoundError("Contact not found");
    }

    return prisma.contact.delete({
        where: { id: contactId }
    });
}

export interface InterviewRoundInput {
    roundType: string;
    scheduledAt?: string;
    interviewerName?: string;
    notes?: string;
    outcome?: string;
}

export async function getInterviewRounds(userId: string, applicationId: string) {
    const application = await prisma.jobApplication.findFirst({
        where: { id: applicationId, userId }
    });

    if (!application) {
        throw new NotFoundError("Application not found");
    }

    return prisma.interviewRound.findMany({
        where: { applicationId },
        orderBy: { createdAt: "desc" }
    });
}

export async function createInterviewRound(
    userId: string,
    applicationId: string,
    data: InterviewRoundInput
) {
    const application = await prisma.jobApplication.findFirst({
        where: { id: applicationId, userId }
    });

    if (!application) {
        throw new NotFoundError("Application not found");
    }

    return prisma.interviewRound.create({
        data: {
            roundType: data.roundType as never,
            scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
            interviewerName: data.interviewerName,
            notes: data.notes,
            outcome: data.outcome as never,
            applicationId
        }
    });
}

export async function updateInterviewRound(
    userId: string,
    applicationId: string,
    roundId: string,
    data: Partial<InterviewRoundInput>
) {
    const application = await prisma.jobApplication.findFirst({
        where: { id: applicationId, userId }
    });

    if (!application) {
        throw new NotFoundError("Application not found");
    }

    const round = await prisma.interviewRound.findFirst({
        where: { id: roundId, applicationId }
    });

    if (!round) {
        throw new NotFoundError("Interview round not found");
    }

    return prisma.interviewRound.update({
        where: { id: roundId },
        data: {
            roundType: data.roundType as never,
            scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
            interviewerName: data.interviewerName,
            notes: data.notes,
            outcome: data.outcome as never
        }
    });
}

export async function deleteInterviewRound(
    userId: string,
    applicationId: string,
    roundId: string
) {
    const application = await prisma.jobApplication.findFirst({
        where: { id: applicationId, userId }
    });

    if (!application) {
        throw new NotFoundError("Application not found");
    }

    const round = await prisma.interviewRound.findFirst({
        where: { id: roundId, applicationId }
    });

    if (!round) {
        throw new NotFoundError("Interview round not found");
    }

    return prisma.interviewRound.delete({
        where: { id: roundId }
    });
}

export interface UpcomingInterview {
    id: string;
    roundType: string;
    scheduledAt: Date;
    interviewerName: string | null;
    notes: string | null;
    outcome: string | null;
    applicationId: string;
    company: string;
    jobTitle: string;
}

export async function getUpcomingInterviews(userId: string): Promise<UpcomingInterview[]> {
    const now = new Date();

    const rounds = await prisma.interviewRound.findMany({
        where: {
            scheduledAt: { gt: now },
            application: { userId }
        },
        include: {
            application: {
                select: {
                    id: true,
                    company: true,
                    jobTitle: true
                }
            }
        },
        orderBy: { scheduledAt: 'asc' }
    });

    return rounds.map((round) => ({
        id: round.id,
        roundType: round.roundType,
        scheduledAt: round.scheduledAt!,
        interviewerName: round.interviewerName,
        notes: round.notes,
        outcome: round.outcome,
        applicationId: round.applicationId,
        company: round.application.company,
        jobTitle: round.application.jobTitle
    }));
}
