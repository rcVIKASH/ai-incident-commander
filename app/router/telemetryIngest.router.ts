import { Router } from "express";
import { telemetryAuthMiddleware } from "../middlewares/telemetryAuth.middleware.js";
import {
  ingestTraces,
  ingestLogs,
  ingestMetrics,
} from "../controllers/telemetryIngest.controller.js";

const router = Router();

router.use(telemetryAuthMiddleware);

router.post("/traces", ingestTraces);
router.post("/logs", ingestLogs);
router.post("/metrics", ingestMetrics);

export default router;
