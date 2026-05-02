import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validation.middleware.js";
import * as ResumesController from "./resumes.controller.js";
import {
    createResumeSchema,
    updateResumeSchema,
    getResumesQuerySchema,
    attachResumeSchema
} from "./resumes.schemas.js";

const router = Router();

router.use(protect);

router
    .route("/")
    .get(
        validateRequest(getResumesQuerySchema, "query"),
        ResumesController.getResumes
    )
    .post(
        validateRequest(createResumeSchema),
        ResumesController.createResume
    );

router
    .route("/:id")
    .get(ResumesController.getResumeById)
    .patch(
        validateRequest(updateResumeSchema),
        ResumesController.updateResume
    )
    .delete(ResumesController.deleteResume);

router.post(
    "/:id/attach",
    validateRequest(attachResumeSchema),
    ResumesController.attachResumeToApplication
);

export default router;
