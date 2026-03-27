import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import * as UsersController from "./users.controller.js";

export const router = Router();

router.use(protect);

router.get("/me", UsersController.getCurrentUser);
router.patch("/me", UsersController.updateCurrentUser);
router.post("/me/change-password", UsersController.changePassword);
router.delete("/me", UsersController.deleteAccount);

export default router;
