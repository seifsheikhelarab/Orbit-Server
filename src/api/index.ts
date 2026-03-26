import { Router } from "express";
import { router as applicationsRouter } from "./applications/applications.router.js";
import documentsRouter from "./documents/documents.router.js";
import applicationDocumentsRouter from "./application-documents/application-documents.router.js";

export const apiRouter = Router();

apiRouter.use("/applications", applicationsRouter);
apiRouter.use("/documents", documentsRouter);
apiRouter.use("/applications", applicationDocumentsRouter);

export default apiRouter;
