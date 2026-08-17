import express, { Router } from "express";
import { telemetryAuthMiddleware } from "../middlewares/telemetryAuth.middleware.js";
import {
  ingestTraces,
  ingestLogs,
  ingestMetrics,
  ingestBatch,
} from "../controllers/telemetryIngest.controller.js";

const router = Router();

router.use(express.json({ limit: "5mb" }));
router.use(telemetryAuthMiddleware);

router.post("/traces", ingestTraces);
router.post("/logs", ingestLogs);
router.post("/metrics", ingestMetrics);
router.post("/ingest", ingestBatch);

export default router;

