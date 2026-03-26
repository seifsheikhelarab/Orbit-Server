import { z } from "zod";

const applicationStatusEnum = z.enum([
    "SAVED",
    "APPLIED",
    "PHONE_SCREEN",
    "INTERVIEW",
    "OFFER",
    "CLOSED"
]);

export const createApplication = z.object({
    company: z.string().min(1, "Company name is required").max(200, "Too long"),
    jobTitle: z.string().min(1, "Job title is required").max(200, "Too long"),
    applicationStatus: applicationStatusEnum.optional(),
    jobURL: z.string().url("Invalid job URL").optional().or(z.literal("")),
    location: z.string().max(200).optional().or(z.literal("")),
    salaryMin: z.number().nonnegative("Salary must be non-negative").optional(),
    salaryMax: z.number().nonnegative("Salary must be non-negative").optional(),
    appliedDate: z.coerce.date().optional(),
    notes: z.string().optional().or(z.literal(""))
});

export const updateApplication = createApplication.partial();

export const applicationStatusValues = [
    "SAVED",
    "APPLIED",
    "PHONE_SCREEN",
    "INTERVIEW",
    "OFFER",
    "CLOSED"
] as const;
export type ApplicationStatus = (typeof applicationStatusValues)[number];

export const getApplicationsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
    search: z.string().optional(),
    status: z.string().optional(),
    location: z.string().optional(),
    applied_from: z.string().optional(),
    applied_to: z.string().optional(),
    salary_min: z.coerce.number().int().nonnegative().optional(),
    salary_max: z.coerce.number().int().nonnegative().optional(),
    sort: z
        .enum([
            "company",
            "jobTitle",
            "applicationStatus",
            "appliedDate",
            "createdAt",
            "updatedAt"
        ])
        .optional(),
    order: z.enum(["asc", "desc"]).optional()
});

export type GetApplicationsQuery = z.infer<typeof getApplicationsQuerySchema>;
