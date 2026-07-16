import { Router } from "express";
import { connect, callback, disconnect, getStatus, resync } from "./gmail.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = Router();

// GET /gmail/callback — public (Google redirects here)
router.get("/callback", callback);

// All other routes require auth
router.use(protect);

router.route("/connect").get(connect);
router.route("/disconnect").post(disconnect);
router.route("/status").get(getStatus);
router.route("/resync").post(resync);

export default router;
