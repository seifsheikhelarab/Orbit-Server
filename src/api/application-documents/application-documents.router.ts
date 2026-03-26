import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import {
    getAttachedDocuments,
    attachDocument,
    detachDocument
} from "./application-documents.controller.js";
import { validateRequest } from "../../middlewares/validation.middleware.js";
import { attachDocumentSchema } from "../documents/documents.schemas.js";

const router = Router();

router.use(protect);

router
    .route("/:id/documents")
    .get(getAttachedDocuments)
    .post(validateRequest(attachDocumentSchema), attachDocument);

router.delete("/:id/documents/:attachmentId", detachDocument);

export default router;
