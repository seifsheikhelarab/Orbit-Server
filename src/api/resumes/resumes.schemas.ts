import { z } from "zod";

export const resumeTypeSchema = z.enum(["RESUME", "COVER_LETTER"]);

export const createResumeSchema = z.object({
    name: z.string().min(1, "Resume name is required").max(100),
    type: resumeTypeSchema.optional(),
    slug: z.string().optional(),
    content: z.any().optional(),
    settings: z.any().optional(),
    isPublic: z.boolean().optional()
});

export const updateResumeSchema = z.record(z.string(), z.any());

export type CreateResumeInput = z.infer<typeof createResumeSchema>;
export type UpdateResumeInput = z.infer<typeof updateResumeSchema>;

export const getResumesQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    type: resumeTypeSchema.optional()
});

export type GetResumesQuery = z.infer<typeof getResumesQuerySchema>;

export const attachResumeSchema = z.object({
    applicationId: z.string().min(1, "Application ID is required")
});

export type AttachResumeInput = z.infer<typeof attachResumeSchema>;
