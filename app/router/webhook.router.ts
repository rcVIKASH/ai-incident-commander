import { Router } from "express";
import { receiveIncidentWebhook } from "../controllers/webhook.controller.js";
import { webhookMiddleware } from "../middlewares/webhook.middleware.js";

const router = Router();

router.post(
  "/incidents",
  webhookMiddleware,
  receiveIncidentWebhook
);

export default router;