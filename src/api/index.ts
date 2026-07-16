import { Router } from "express";
import { router as applicationsRouter } from "./applications/applications.router.js";
import notificationsRouter from "./notifications/notifications.router.js";
import remindersRouter from "./reminders/reminders.router.js";
import authRouter from "./auth/auth.router.js";
import analyticsRouter from "./analytics/analytics.router.js";
import usersRouter from "./users/users.router.js";
import resumesRouter from "./resumes/resumes.router.js";
import profileRouter from "./profile/profile.router.js";
import gmailRouter from "./gmail/gmail.router.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/applications", applicationsRouter);
apiRouter.use("/notifications", notificationsRouter);
apiRouter.use("/reminders", remindersRouter);
apiRouter.use("/analytics", analyticsRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/resumes", resumesRouter);
apiRouter.use("/profile", profileRouter);
apiRouter.use("/gmail", gmailRouter);

export default apiRouter;
