import { Router } from "express";
import { profileController } from "./profile.controller.js";
import { autoCvController } from "./autocv.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = Router();

// Profile Management
router.get("/", protect, profileController.getProfile);
router.put("/", protect, profileController.updateProfile);

// AutoCV Features
router.post("/generate", protect, autoCvController.generate);
router.post("/save", protect, autoCvController.save);

export default router;
