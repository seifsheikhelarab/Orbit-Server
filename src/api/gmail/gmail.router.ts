import { Router } from "express";
import { connect, callback, disconnect, getStatus, resync } from "./gmail.controller.js";
import { getInboxEntries, getInboxEntry, linkToApplication, unlinkFromApplication } from "./inbox.controller.js";
import { getSuggestions, getSuggestion, acceptSuggestion, dismissSuggestion } from "./suggestions.controller.js";
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

router.route("/inbox").get(getInboxEntries);
router.route("/inbox/:id").get(getInboxEntry);
router.route("/inbox/:id/link").post(linkToApplication);
router.route("/inbox/:id/unlink").post(unlinkFromApplication);

router.route("/suggestions").get(getSuggestions);
router.route("/suggestions/:id").get(getSuggestion);
router.route("/suggestions/:id/accept").post(acceptSuggestion);
router.route("/suggestions/:id/dismiss").post(dismissSuggestion);

export default router;
