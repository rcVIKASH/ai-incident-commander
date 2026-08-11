import { Router } from "express";
import { receiveIncidentWebhook } from "../controllers/webhook.controller.js";
import { webhookAuth } from "../middlewares/webhook.middleware.js";

const router = Router();

router.post(
  "/incidents",
  webhookAuth,
  receiveIncidentWebhook
);

export default router;