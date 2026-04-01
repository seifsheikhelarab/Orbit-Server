import { z } from "zod";

export const createResumeSchema = z.object({
    name: z.string().min(1, "Resume name is required").max(100),
    slug: z.string().optional(),
    content: z.record(z.string(), z.any()).default({
        basics: {
            name: "",
            label: "",
            email: "",
            phone: "",
            url: "",
            summary: "",
            location: "",
            profiles: []
        },
        work: [],
        education: [],
        skills: []
    }),
    settings: z.record(z.string(), z.any()).default({
        template: "modern",
        color: "#1e3a8a"
    }),
    isPublic: z.boolean().default(false)
});

export const updateResumeSchema = createResumeSchema.partial();

export type CreateResumeInput = z.infer<typeof createResumeSchema>;
export type UpdateResumeInput = z.infer<typeof updateResumeSchema>;

export const getResumesQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20)
});

export type GetResumesQuery = z.infer<typeof getResumesQuerySchema>;
