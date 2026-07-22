import prisma from "../../utils/prisma.js";
import { AppError, HttpStatus } from "../../utils/response.js";
import { Prisma, type suggestionType } from "../../generated/prisma/index.js";

export interface GetSuggestionsParams {
    page: number;
    limit: number;
    status?: string;
    applicationId?: string;
}

export async function getSuggestions(userId: string, params: GetSuggestionsParams) {
    const { page, limit, status, applicationId } = params;

    const where: Prisma.PendingSuggestionWhereInput = {
        application: { userId }
    };

    if (status) {
        where.status = status as Prisma.EnumsuggestionStatusFilter["equals"];
    }

    if (applicationId) {
        where.applicationId = applicationId;
    }

    const [suggestions, total] = await Promise.all([
        prisma.pendingSuggestion.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                inboxEntry: { select: { id: true, subject: true, sender: true, senderName: true, snippet: true, receivedAt: true } },
                application: { select: { id: true, company: true, jobTitle: true, applicationStatus: true } }
            }
        }),
        prisma.pendingSuggestion.count({ where })
    ]);

    return { suggestions, total, page, limit };
}

export async function getSuggestion(userId: string, suggestionId: string) {
    const suggestion = await prisma.pendingSuggestion.findFirst({
        where: { id: suggestionId, application: { userId } },
        include: {
            inboxEntry: true,
            application: { select: { id: true, company: true, jobTitle: true, applicationStatus: true } }
        }
    });

    if (!suggestion) {
        throw new AppError("Suggestion not found", HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND");
    }

    return suggestion;
}

async function verifyOwnership(userId: string, suggestionId: string) {
    const suggestion = await prisma.pendingSuggestion.findFirst({
        where: { id: suggestionId, application: { userId } },
        include: { application: true }
    });

    if (!suggestion) {
        throw new AppError("Suggestion not found", HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND");
    }

    if (suggestion.status !== "PENDING") {
        throw new AppError("Suggestion already processed", HttpStatus.BAD_REQUEST, "VALIDATION_ERROR");
    }

    return suggestion;
}

export async function acceptSuggestion(userId: string, suggestionId: string) {
    const suggestion = await verifyOwnership(userId, suggestionId);
    const value = suggestion.suggestedValue as Record<string, unknown>;

    await prisma.$transaction(async (tx) => {
        switch (suggestion.type as suggestionType) {
            case "STATUS_TRANSITION": {
                const newStatus = value.status as string;
                const existing = await tx.jobApplication.findUnique({ where: { id: suggestion.applicationId } });
                if (!existing) throw new AppError("Application not found", HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND");

                await tx.jobApplication.update({
                    where: { id: suggestion.applicationId },
                    data: { applicationStatus: newStatus as never }
                });

                await tx.statusHistory.create({
                    data: {
                        applicationId: suggestion.applicationId,
                        fromStatus: existing.applicationStatus,
                        toStatus: newStatus as never,
                        note: "Accepted from Gmail suggestion"
                    }
                });
                break;
            }

            case "CONTACT_CREATE": {
                await tx.contact.create({
                    data: {
                        applicationId: suggestion.applicationId,
                        name: value.name as string,
                        title: (value.title as string) ?? null,
                        email: (value.email as string) ?? null,
                        phone: (value.phone as string) ?? null,
                        source: "gmail-auto"
                    }
                });
                break;
            }

            case "INTERVIEW_CREATE": {
                await tx.interviewRound.create({
                    data: {
                        applicationId: suggestion.applicationId,
                        roundType: value.roundType as never,
                        scheduledAt: value.scheduledAt ? new Date(value.scheduledAt as string) : null,
                        interviewerName: (value.interviewerName as string) ?? null,
                        source: "gmail-auto"
                    }
                });
                break;
            }
        }

        await tx.pendingSuggestion.update({
            where: { id: suggestionId },
            data: { status: "ACCEPTED" }
        });
    });

    return { id: suggestionId, status: "ACCEPTED" as const };
}

export async function dismissSuggestion(userId: string, suggestionId: string) {
    const suggestion = await verifyOwnership(userId, suggestionId);

    await prisma.pendingSuggestion.update({
        where: { id: suggestionId },
        data: { status: "DISMISSED" }
    });

    return { id: suggestionId, status: "DISMISSED" as const };
}
