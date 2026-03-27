import { z } from "zod";

export const analyticsQuerySchema = z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    granularity: z.enum(["week", "month"]).optional()
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
