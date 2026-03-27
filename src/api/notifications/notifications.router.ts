import { Router } from "express";
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    snoozeNotification,
    dismissNotification
} from "./notifications.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = Router();

router.use(protect);

router.route("/").get(getNotifications);
router.route("/unread-count").get(getUnreadCount);
router.route("/read-all").patch(markAllAsRead);
router.route("/:id/read").patch(markAsRead);
router.route("/:id/snooze").post(snoozeNotification);
router.route("/:id/done").post(dismissNotification);

export default router;
