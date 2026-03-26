import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import { upload } from "../../middlewares/upload.middleware.js";
import {
    getDocuments,
    getDocumentById,
    createDocument,
    updateDocument,
    deleteDocument,
    uploadNewVersion,
    downloadVersion,
    previewVersion
} from "./documents.controller.js";
import { validateRequest } from "../../middlewares/validation.middleware.js";
import {
    createDocumentSchema,
    updateDocumentSchema,
    getDocumentsQuerySchema
} from "./documents.schemas.js";

const router = Router();

router.use(protect);

router
    .route("/")
    .get(validateRequest(getDocumentsQuerySchema, "query"), getDocuments)
    .post(
        upload.single("file"),
        validateRequest(createDocumentSchema),
        createDocument
    );

router
    .route("/:id")
    .get(getDocumentById)
    .patch(validateRequest(updateDocumentSchema), updateDocument)
    .delete(deleteDocument);

router.post("/:id/versions", upload.single("file"), uploadNewVersion);

router.get("/:id/versions/:versionId/download", downloadVersion);
router.get("/:id/versions/:versionId/preview", previewVersion);

export default router;
