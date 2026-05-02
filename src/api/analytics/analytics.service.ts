import prisma from "../../utils/prisma.js";
import { ANALYTICS_DEFAULTS, parsePeriodToDates } from "./analytics.schemas.js";
import type { AnalyticsQuery } from "./analytics.schemas.js";

export interface SummaryStats {
    totalApplications: number;
    activePipeline: number;
    responseRate: number;
    offerRate: number;
    totalApplicationsTrend: number;
    totalApplicationsTrendDirection: 'up' | 'down' | 'neutral';
    activeTrend: number;
    activeTrendDirection: 'up' | 'down' | 'neutral';
    responseRateTrend: number;
    responseRateTrendDirection: 'up' | 'down' | 'neutral';
    offerRateTrend: number;
    offerRateTrendDirection: 'up' | 'down' | 'neutral';
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
    const { from: periodFrom, to: periodTo } = parsePeriodToDates(query.period);
    const from = parseDate(periodFrom, () => {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        return d;
    });
    const to = parseDate(periodTo, () => new Date());

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

    // Calculate trends by comparing with previous period
    const periodLength = from && to ? Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) : 90;
    const prevTo = from ? new Date(from) : new Date();
    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - periodLength);

    const prevApplications = await prisma.jobApplication.findMany({
        where: {
            userId,
            appliedDate: {
                gte: prevFrom,
                lt: prevTo
            }
        },
        select: {
            applicationStatus: true
        }
    });

    const prevAppliedApps = prevApplications.filter(
        (app: ApplicationStatus) => app.applicationStatus !== "SAVED"
    );
    const prevTotalApplications = prevAppliedApps.length;

    const prevActivePipeline = prevApplications.filter((app: ApplicationStatus) =>
        ["APPLIED", "PHONE_SCREEN", "INTERVIEW", "OFFER"].includes(app.applicationStatus)
    ).length;

    const prevRespondedApps = prevAppliedApps.filter((app: ApplicationStatus) =>
        !["APPLIED", "SAVED", "CLOSED"].includes(app.applicationStatus)
    );
    const prevResponseRate =
        prevTotalApplications > 0
            ? Math.round((prevRespondedApps.length / prevTotalApplications) * 1000) / 10
            : 0;

    const prevOfferApps = prevAppliedApps.filter(
        (app: ApplicationStatus) => app.applicationStatus === "OFFER"
    ).length;
    const prevOfferRate =
        prevTotalApplications > 0
            ? Math.round((prevOfferApps / prevTotalApplications) * 1000) / 10
            : 0;

    // Calculate trends
    const totalApplicationsTrend = prevTotalApplications > 0
        ? Math.round(((totalApplications - prevTotalApplications) / prevTotalApplications) * 1000) / 10
        : (totalApplications > 0 ? 100 : 0);
    const activeTrend = prevActivePipeline > 0
        ? Math.round(((activePipeline - prevActivePipeline) / prevActivePipeline) * 1000) / 10
        : (activePipeline > 0 ? 100 : 0);
    const responseRateTrend = prevResponseRate > 0
        ? Math.round((responseRate - prevResponseRate) * 10) / 10
        : 0;
    const offerRateTrend = prevOfferRate > 0
        ? Math.round((offerRate - prevOfferRate) * 10) / 10
        : 0;

    const getDirection = (trend: number): 'up' | 'down' | 'neutral' => {
        if (trend > 0) return 'up';
        if (trend < 0) return 'down';
        return 'neutral';
    };

    return {
        totalApplications,
        activePipeline,
        responseRate,
        offerRate,
        totalApplicationsTrend: Math.abs(totalApplicationsTrend),
        totalApplicationsTrendDirection: getDirection(totalApplicationsTrend),
        activeTrend: Math.abs(activeTrend),
        activeTrendDirection: getDirection(activeTrend),
        responseRateTrend: Math.abs(responseRateTrend),
        responseRateTrendDirection: getDirection(responseRateTrend),
        offerRateTrend: Math.abs(offerRateTrend),
        offerRateTrendDirection: getDirection(offerRateTrend)
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
    const { from: periodFrom, to: periodTo } = parsePeriodToDates(query.period);
    
    // Auto-select granularity based on period if not provided
    let granularity = query.granularity;
    if (!granularity) {
        if (query.period === "7d") granularity = "day";
        else if (query.period === "30d") granularity = "week";
        else granularity = "month";
    }

    const dateTrunc = granularity === "day" ? "day" : (granularity === "week" ? "week" : "month");

    const from = parseDate(periodFrom, () => {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        return d;
    });
    const to = parseDate(periodTo, () => new Date());

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

    rawQuery += ` GROUP BY DATE_TRUNC('${dateTrunc}', "appliedDate") ORDER BY period ASC`;

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
    const { from: periodFrom, to: periodTo } = parsePeriodToDates(query.period);
    const from = parseDate(periodFrom, () => {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        return d;
    });
    const to = parseDate(periodTo, () => new Date());

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

export interface RecentActivity {
    id: string;
    applicationId: string;
    company: string;
    jobTitle: string;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    changedAt: string;
}

export async function getRecentActivity(
    userId: string,
    limit: number = 10
): Promise<RecentActivity[]> {
    const history = await prisma.statusHistory.findMany({
        where: {
            application: { userId }
        },
        include: {
            application: {
                select: {
                    company: true,
                    jobTitle: true
                }
            }
        },
        orderBy: { changedAt: "desc" },
        take: limit
    });

    return history.map((h) => ({
        id: h.id,
        applicationId: h.applicationId,
        company: h.application.company,
        jobTitle: h.application.jobTitle,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        note: h.note,
        changedAt: h.changedAt.toISOString()
    }));
}

export interface SankeyNode {
    name: string;
}

export interface SankeyLink {
    source: number;
    target: number;
    value: number;
}

export interface PipelineFlowData {
    nodes: SankeyNode[];
    links: SankeyLink[];
}

export async function getPipelineFlow(
    userId: string
): Promise<PipelineFlowData> {
    const nodes = [
        { name: "Saved" },
        { name: "Applied" },
        { name: "Phone Screen" },
        { name: "Interview" },
        { name: "Offer" },
        { name: "Closed" },
    ];

    const statusToIndex: Record<string, number> = {
        "SAVED": 0,
        "APPLIED": 1,
        "PHONE_SCREEN": 2,
        "INTERVIEW": 3,
        "OFFER": 4,
        "CLOSED": 5,
    };

    // Get transitions from StatusHistory
    // Note: We include null fromStatus to capture initial movements
    const statusHistory = await prisma.statusHistory.findMany({
        where: {
            application: { userId }
        },
        select: {
            fromStatus: true,
            toStatus: true
        }
    });

    const linksMap = new Map<string, number>();

    for (const h of statusHistory) {
        if (!h.toStatus) continue;

        let sourceIdx: number | undefined;
        if (!h.fromStatus) {
            // If fromStatus is null, it's an initial status.
            // We can't easily show "creation" in Sankey without a start node,
            // so we skip these for now or attribute to a virtual start.
            continue;
        } else {
            sourceIdx = statusToIndex[h.fromStatus];
        }

        const targetIdx = statusToIndex[h.toStatus];
        
        if (sourceIdx !== undefined && targetIdx !== undefined) {
            const key = `${sourceIdx}-${targetIdx}`;
            linksMap.set(key, (linksMap.get(key) || 0) + 1);
        }
    }

    let links: SankeyLink[] = Array.from(linksMap.entries()).map(([key, value]) => {
        const [source, target] = key.split("-").map(Number);
        return { source: source!, target: target!, value };
    });

    // Fallback/Supplement: Include current volume if history is sparse
    const currentStatuses = await prisma.jobApplication.groupBy({
        by: ["applicationStatus"],
        where: { userId },
        _count: { id: true }
    });

    const statusCounts: Record<string, number> = {};
    for (const s of currentStatuses) {
        statusCounts[s.applicationStatus] = Number(s._count.id);
    }

    if (links.length === 0) {
        const order = ["SAVED", "APPLIED", "PHONE_SCREEN", "INTERVIEW", "OFFER", "CLOSED"];
        for (let i = 0; i < order.length - 1; i++) {
            const sourceStatus = order[i]!;
            const targetStatus = order[i+1]!;
            const count = statusCounts[sourceStatus] || 0;
            
            if (count > 0) {
                links.push({
                    source: statusToIndex[sourceStatus]!,
                    target: statusToIndex[targetStatus]!,
                    value: count
                });
            }
        }
    }

    // FINAL CHECK: If links still empty but we have data, create a self-link or minimal flow
    // so nodes show up. Recharts Sankey requires links to calculate node values.
    if (links.length === 0) {
        for (const [status, count] of Object.entries(statusCounts)) {
            if (count > 0) {
                const idx = statusToIndex[status];
                if (idx !== undefined) {
                    // Link to next if possible, otherwise just a tiny flow to nowhere?
                    // Sankey is hard with single nodes. Let's just link to "Closed" or next.
                    const nextIdx = idx < 5 ? idx + 1 : idx - 1;
                    links.push({ source: idx, target: nextIdx, value: count });
                }
            }
        }
    }

    return { nodes, links };
}
