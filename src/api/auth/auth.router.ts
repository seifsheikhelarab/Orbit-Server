import { Router } from "express";
import * as authController from "./auth.controller.js";
import * as authSchemas from "./auth.schemas.js";
import { validateRequest } from "../../middlewares/validation.middleware.js";

const router = Router();

router.post(
    "/register",
    validateRequest(authSchemas.registerSchema),
    authController.handleSignUp
);
router.post(
    "/login",
    validateRequest(authSchemas.loginSchema),
    authController.handleSignIn
);
router.post("/logout", authController.handleSignOut);
router.get("/me", authController.handleGetMe);

export default router;
