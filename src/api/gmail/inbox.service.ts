import prisma from "../../utils/prisma.js";
import { AppError, HttpStatus } from "../../utils/response.js";

interface InboxQuery {
    page: number;
    limit: number;
    filter: "all" | "matched" | "unmatched";
    search?: string;
}

export async function getInboxEntries(userId: string, { page, limit, filter, search }: InboxQuery) {
    const where: Record<string, unknown> = { userId };

    if (filter === "matched") {
        where.matched = true;
    } else if (filter === "unmatched") {
        where.matched = false;
        where.parseFailed = false;
    }

    if (search) {
        where.OR = [
            { subject: { contains: search, mode: "insensitive" } },
            { sender: { contains: search, mode: "insensitive" } },
            { senderName: { contains: search, mode: "insensitive" } }
        ];
    }

    const [entries, total] = await Promise.all([
        prisma.inboxEntry.findMany({
            where,
            include: {
                application: {
                    select: { id: true, company: true, jobTitle: true, applicationStatus: true }
                }
            },
            orderBy: { receivedAt: "desc" },
            skip: (page - 1) * limit,
            take: limit
        }),
        prisma.inboxEntry.count({ where })
    ]);

    return { entries, total };
}

export async function getInboxEntry(userId: string, entryId: string) {
    const entry = await prisma.inboxEntry.findFirst({
        where: { id: entryId, userId },
        include: {
            application: true,
            suggestions: true
        }
    });

    if (!entry) {
        throw new AppError("Inbox entry not found", HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND");
    }

    return entry;
}

export async function linkToApplication(userId: string, entryId: string, applicationId: string) {
    return prisma.$transaction(async (tx) => {
        const entry = await tx.inboxEntry.findFirst({
            where: { id: entryId, userId }
        });

        if (!entry) {
            throw new AppError("Inbox entry not found", HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND");
        }

        const application = await tx.jobApplication.findFirst({
            where: { id: applicationId, userId }
        });

        if (!application) {
            throw new AppError("Application not found", HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND");
        }

        return tx.inboxEntry.update({
            where: { id: entryId },
            data: {
                matchedApplicationId: applicationId,
                matched: true,
                manuallyLinked: true
            }
        });
    });
}

export async function unlinkFromApplication(userId: string, entryId: string) {
    const entry = await prisma.inboxEntry.findFirst({
        where: { id: entryId, userId }
    });

    if (!entry) {
        throw new AppError("Inbox entry not found", HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND");
    }

    return prisma.inboxEntry.update({
        where: { id: entryId },
        data: {
            matchedApplicationId: null,
            matched: false
        }
    });
}
