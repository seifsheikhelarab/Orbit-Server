import { z } from "zod";

export const analyticsQuerySchema = z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    granularity: z.enum(["day", "week", "month"]).optional(),
    period: z.enum(["7d", "30d", "90d", "year", "all"]).optional()
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

export const ANALYTICS_DEFAULTS = {
    from: () => {
        const date = new Date();
        date.setDate(date.getDate() - 90);
        return date.toISOString().split("T")[0];
    },
    to: () => new Date().toISOString().split("T")[0],
    granularity: "week" as const
};

export function parsePeriodToDates(period?: string): { from?: string; to?: string } {
    if (!period || period === "all") {
        return {};
    }
    
    const to = new Date();
    const from = new Date();
    
    switch (period) {
        case "7d":
            from.setDate(from.getDate() - 7);
            break;
        case "30d":
            from.setDate(from.getDate() - 30);
            break;
        case "90d":
            from.setDate(from.getDate() - 90);
            break;
        case "year":
            from.setFullYear(from.getFullYear() - 1);
            break;
    }
    
    return {
        from: from.toISOString().split("T")[0],
        to: to.toISOString().split("T")[0]
    };
}
