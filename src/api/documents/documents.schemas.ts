import { z } from "zod";

export const documentTypeSchema = z.enum(["CV", "COVER_LETTER", "OTHER"]);

export const createDocumentSchema = z.object({
    name: z.string().min(1).max(200),
    type: documentTypeSchema
});

export const updateDocumentSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    type: documentTypeSchema.optional(),
    activeVersionId: z.string().optional()
});

export const getDocumentsQuerySchema = z.object({
    type: documentTypeSchema.optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20)
});

export const attachDocumentSchema = z.object({
    documentVersionId: z.string().min(1)
});

export type DocumentType = z.infer<typeof documentTypeSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type GetDocumentsQuery = z.infer<typeof getDocumentsQuerySchema>;
export type AttachDocumentInput = z.infer<typeof attachDocumentSchema>;
