import prisma from "../../utils/prisma.js";
import { ANALYTICS_DEFAULTS } from "./analytics.schemas.js";
import type { AnalyticsQuery } from "./analytics.schemas.js";

export interface SummaryStats {
    totalApplications: number;
    activePipeline: number;
    responseRate: number;
    offerRate: number;
}

export interface PipelineStage {
    status: string;
    count: number;
    conversionFromPrev: number | null;
}

export interface TimeSeriesData {
    period: string;
    count: number;
}

export interface TopLocation {
    location: string;
    count: number;
}

export interface SourceBreakdown {
    source: string;
    count: number;
}

function parseDate(dateStr: string | undefined, fallback: () => Date): Date | null {
    if (dateStr === "" || dateStr === undefined) {
        return null;
    }
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? fallback() : parsed;
}

interface ApplicationStatus {
    applicationStatus: string;
}

export async function getSummaryStats(
    userId: string,
    query: AnalyticsQuery
): Promise<SummaryStats> {
    const from = parseDate(query.from, () => {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        return d;
    });
    const to = parseDate(query.to, () => new Date());

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (from !== null) dateFilter.gte = from;
    if (to !== null) dateFilter.lte = to;

    const applications = await prisma.jobApplication.findMany({
        where: {
            userId,
            appliedDate: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
        },
        select: {
            applicationStatus: true,
            createdAt: true,
            updatedAt: true
        }
    });

    const appliedApps = applications.filter(
        (app: ApplicationStatus) => app.applicationStatus !== "SAVED"
    );

    const totalApplications = appliedApps.length;

    const activePipeline = applications.filter((app: ApplicationStatus) =>
        ["APPLIED", "PHONE_SCREEN", "INTERVIEW", "OFFER"].includes(
            app.applicationStatus
        )
    ).length;

    const respondedApps = appliedApps.filter((app: ApplicationStatus) =>
        !["APPLIED", "SAVED", "CLOSED"].includes(app.applicationStatus)
    );
    const responseRate =
        totalApplications > 0
            ? Math.round((respondedApps.length / totalApplications) * 1000) / 10
            : 0;

    const offerApps = appliedApps.filter(
        (app: ApplicationStatus) => app.applicationStatus === "OFFER"
    ).length;
    const offerRate =
        totalApplications > 0
            ? Math.round((offerApps / totalApplications) * 1000) / 10
            : 0;

    return {
        totalApplications,
        activePipeline,
        responseRate,
        offerRate
    };
}

interface TimeSeriesRow {
    period: Date;
    count: bigint;
}

export async function getApplicationsOverTime(
    userId: string,
    query: AnalyticsQuery
): Promise<TimeSeriesData[]> {
    const granularity = query.granularity ?? ANALYTICS_DEFAULTS.granularity;
    const dateTrunc = granularity === "week" ? "week" : "month";

    const from = parseDate(query.from, () => {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        return d;
    });
    const to = parseDate(query.to, () => new Date());

    let rawQuery = `
        SELECT
            DATE_TRUNC('${dateTrunc}', "appliedDate") AS period,
            COUNT(*)::bigint AS count
        FROM "JobApplication"
        WHERE "userId" = $1
          AND "appliedDate" IS NOT NULL
          AND "applicationStatus" != 'SAVED'
    `;
    const params: (string | Date)[] = [userId];
    let paramIndex = 2;

    if (from !== null) {
        rawQuery += ` AND "appliedDate" >= $${paramIndex}`;
        params.push(from);
        paramIndex++;
    }
    if (to !== null) {
        rawQuery += ` AND "appliedDate" <= $${paramIndex}`;
        params.push(to);
        paramIndex++;
    }

    rawQuery += ` GROUP BY period ORDER BY period ASC`;

    const result = await prisma.$queryRawUnsafe<TimeSeriesRow[]>(
        rawQuery,
        ...params
    );

    return result.map((row: TimeSeriesRow) => ({
        period: row.period?.toISOString().split("T")[0] ?? "",
        count: Number(row.count)
    }));
}

interface PipelineRow {
    applicationStatus: string;
    count: bigint;
}

export async function getPipelineFunnel(
    userId: string,
    query: AnalyticsQuery
): Promise<PipelineStage[]> {
    const from = parseDate(query.from, () => {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        return d;
    });
    const to = parseDate(query.to, () => new Date());

    let rawQuery = `SELECT "applicationStatus", COUNT(*)::bigint AS count
        FROM "JobApplication"
        WHERE "userId" = $1`;
    const params: (string | Date)[] = [userId];
    let paramIndex = 2;

    if (from !== null) {
        rawQuery += ` AND "appliedDate" >= $${paramIndex}`;
        params.push(from);
        paramIndex++;
    }
    if (to !== null) {
        rawQuery += ` AND "appliedDate" <= $${paramIndex}`;
        params.push(to);
        paramIndex++;
    }

    rawQuery += ` GROUP BY "applicationStatus"`;

    const result = await prisma.$queryRawUnsafe<PipelineRow[]>(
        rawQuery,
        ...params
    );

    const statusOrder = [
        "APPLIED",
        "PHONE_SCREEN",
        "INTERVIEW",
        "OFFER",
        "CLOSED",
        "SAVED"
    ];

    const statusMap = new Map<string, number>();
    for (const r of result) {
        statusMap.set(r.applicationStatus, Number(r.count));
    }

    const stages: PipelineStage[] = [];
    for (let index = 0; index < statusOrder.length; index++) {
        const status = statusOrder[index]!;
        if (statusMap.has(status)) {
            const count = statusMap.get(status) ?? 0;
            let conversionFromPrev: number | null = null;

            if (index > 0) {
                const prevStatus = statusOrder
                    .slice(0, index)
                    .reverse()
                    .find((s) => statusMap.has(s));
                if (prevStatus) {
                    const prevCount = statusMap.get(prevStatus) ?? 0;
                    conversionFromPrev =
                        prevCount > 0
                            ? Math.round((count / prevCount) * 1000) / 10
                            : 0;
                }
            }

            stages.push({
                status,
                count,
                conversionFromPrev
            });
        }
    }

    return stages;
}

export async function getStatusBreakdown(
    userId: string
): Promise<Array<{ status: string; count: number }>> {
    const result = await prisma.jobApplication.groupBy({
        by: ["applicationStatus"],
        where: { userId },
        _count: { id: true }
    });

    return result.map((r) => ({
        status: r.applicationStatus,
        count: r._count.id
    }));
}

interface TrendRow {
    period: Date;
    applied: number;
    responded: number;
}

export async function getResponseRateTrend(
    userId: string,
    query: AnalyticsQuery
): Promise<TimeSeriesData[]> {
    const granularity = query.granularity ?? ANALYTICS_DEFAULTS.granularity;
    const dateTrunc = granularity === "week" ? "week" : "month";

    const from = parseDate(query.from, () => {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        return d;
    });
    const to = parseDate(query.to, () => new Date());

    let whereClause = `WHERE "userId" = $1 AND "appliedDate" IS NOT NULL`;
    const params: (string | Date)[] = [userId];
    let paramIndex = 2;

    if (from !== null) {
        whereClause += ` AND "appliedDate" >= $${paramIndex}`;
        params.push(from);
        paramIndex++;
    }
    if (to !== null) {
        whereClause += ` AND "appliedDate" <= $${paramIndex}`;
        params.push(to);
        paramIndex++;
    }

    const rawQuery = `
        WITH periods AS (
            SELECT
                DATE_TRUNC('${dateTrunc}', "appliedDate") AS period,
                COUNT(*) FILTER (WHERE "applicationStatus" != 'SAVED') AS applied,
                COUNT(*) FILTER (
                    WHERE "applicationStatus" NOT IN ('APPLIED', 'SAVED', 'CLOSED')
                ) AS responded
            FROM "JobApplication"
            ${whereClause}
            GROUP BY period
        )
        SELECT
            period,
            applied::int AS applied,
            responded::int AS responded
        FROM periods
        ORDER BY period ASC
    `;

    const result = await prisma.$queryRawUnsafe<TrendRow[]>(
        rawQuery,
        ...params
    );

    return result.map((row: TrendRow) => {
        const rate = row.applied > 0
            ? Math.round((row.responded / row.applied) * 1000) / 10
            : 0;
        return {
            period: row.period?.toISOString().split("T")[0] ?? "",
            count: rate
        };
    });
}

export async function getTopLocations(
    userId: string,
    limit: number = 10
): Promise<TopLocation[]> {
    const result = await prisma.jobApplication.groupBy({
        by: ["location"],
        where: {
            userId,
            location: { not: null }
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: limit
    });

    return result.map((r) => ({
        location: r.location ?? "Unknown",
        count: r._count.id
    }));
}

export async function getSourceBreakdown(
    userId: string
): Promise<SourceBreakdown[]> {
    const result = await prisma.jobApplication.groupBy({
        by: ["source"],
        where: {
            userId,
            source: { not: null }
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } }
    });

    let totalWithSource = 0;
    for (const r of result) {
        totalWithSource += r._count.id;
    }

    const total = await prisma.jobApplication.count({
        where: { userId }
    });

    const unspecified = total - totalWithSource;

    const breakdown: SourceBreakdown[] = result.map((r) => ({
        source: r.source ?? "Unknown",
        count: r._count.id
    }));

    if (unspecified > 0) {
        breakdown.push({ source: "Not specified", count: unspecified });
    }

    return breakdown;
}
