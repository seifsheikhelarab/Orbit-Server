import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import {
    getSummary,
    getApplicationsOverTime,
    getPipelineFunnel,
    getStatusBreakdown,
    getResponseRateTrend,
    getTopLocations,
    getSourceBreakdown,
    getRecentActivity,
    getPipelineFlow
} from "./analytics.controller.js";

const router = Router();

router.use(protect);

router.get("/summary", getSummary);
router.get("/applications-over-time", getApplicationsOverTime);
router.get("/pipeline-funnel", getPipelineFunnel);
router.get("/status-breakdown", getStatusBreakdown);
router.get("/response-rate-trend", getResponseRateTrend);
router.get("/top-locations", getTopLocations);
router.get("/source-breakdown", getSourceBreakdown);
router.get("/recent-activity", getRecentActivity);
router.get("/pipeline-flow", getPipelineFlow);

export default router;
