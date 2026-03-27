import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import { clearReminder, handleReminderAction } from "./reminders.controller.js";

const router = Router();

router.get("/action", handleReminderAction);

router.use(protect);

router.delete("/:id", clearReminder);

export default router;
