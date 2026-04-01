import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validation.middleware.js";
import * as ResumesController from "./resumes.controller.js";
import {
    createResumeSchema,
    updateResumeSchema,
    getResumesQuerySchema
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

export default router;
