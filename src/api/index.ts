import { Router } from "express";
import { router as applicationsRouter } from "./applications/applications.router.js";
import documentsRouter from "./documents/documents.router.js";
import applicationDocumentsRouter from "./application-documents/application-documents.router.js";
import notificationsRouter from "./notifications/notifications.router.js";
import remindersRouter from "./reminders/reminders.router.js";
import authRouter from "./auth/auth.router.js";
import analyticsRouter from "./analytics/analytics.router.js";
import usersRouter from "./users/users.router.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/applications", applicationsRouter);
apiRouter.use("/documents", documentsRouter);
apiRouter.use("/applications", applicationDocumentsRouter);
apiRouter.use("/notifications", notificationsRouter);
apiRouter.use("/reminders", remindersRouter);
apiRouter.use("/analytics", analyticsRouter);
apiRouter.use("/users", usersRouter);

export default apiRouter;
