import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import * as applicationsController from "./applications.controller.js";
import * as applicationsSchemas from "./applications.schemas.js";
import { validateRequest } from "../../middlewares/validation.middleware.js";

export const router = Router();

router.use(protect);

router.get(
    "/document-counts",
    applicationsController.getApplicationDocumentCountsHandler
);

router
    .route("/")
    .get(applicationsController.getApplications)
    .post(
        validateRequest(applicationsSchemas.createApplication),
        applicationsController.createApplication
    );

router
    .route("/:id")
    .get(applicationsController.getApplicationDetails)
    .patch(
        validateRequest(applicationsSchemas.updateApplication),
        applicationsController.updateApplication
    )
    .delete(applicationsController.deleteApplication);
