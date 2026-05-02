import { Router } from "express";
import { router as applicationsRouter } from "./applications/applications.router.js";
import notificationsRouter from "./notifications/notifications.router.js";
import remindersRouter from "./reminders/reminders.router.js";
import authRouter from "./auth/auth.router.js";
import analyticsRouter from "./analytics/analytics.router.js";
import usersRouter from "./users/users.router.js";
import resumesRouter from "./resumes/resumes.router.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/applications", applicationsRouter);
apiRouter.use("/notifications", notificationsRouter);
apiRouter.use("/reminders", remindersRouter);
apiRouter.use("/analytics", analyticsRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/resumes", resumesRouter);

export default apiRouter;
