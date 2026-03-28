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

router.get("/export/csv", applicationsController.exportApplicationsCSV);

router
    .route("/")
    .get(applicationsController.getApplications)
    .post(
        validateRequest(applicationsSchemas.createApplication),
        applicationsController.createApplication
    );

router
    .route("/bulk")
    .patch(applicationsController.bulkUpdateApplications)
    .delete(applicationsController.bulkDeleteApplications);

router.get("/ids", applicationsController.getAllApplicationIds);

router
    .route("/:id")
    .get(applicationsController.getApplicationDetails)
    .patch(
        validateRequest(applicationsSchemas.updateApplication),
        applicationsController.updateApplication
    )
    .delete(applicationsController.deleteApplication);

router.get("/:id/status-history", applicationsController.getStatusHistory);
router.get("/:id/contacts", applicationsController.getContacts);
router.post("/:id/contacts", applicationsController.createContact);
router.patch("/:id/contacts/:contactId", applicationsController.updateContact);
router.delete("/:id/contacts/:contactId", applicationsController.deleteContact);

router.get("/:id/interviews", applicationsController.getInterviewRounds);
router.post("/:id/interviews", applicationsController.createInterviewRound);
router.patch("/:id/interviews/:roundId", applicationsController.updateInterviewRound);
router.delete("/:id/interviews/:roundId", applicationsController.deleteInterviewRound);
