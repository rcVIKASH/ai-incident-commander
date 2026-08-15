import wrapAsync from "../utils/warpAsync.js";
import ExpressError from "../utils/expressError.js";
import { incidentWebhookSchema } from "../validators/webhook.validation.js";
import { createIncidentService } from "../services/incident.service.js";

export const receiveIncidentWebhook = wrapAsync(async (req, res) => {
  const data = incidentWebhookSchema.parse(req.body);

  const organization = req.organization;

  if (!organization) {
    throw new ExpressError("Organization not found", 401);
  }

  const incident = await createIncidentService({
    organizationId: organization.id,
    externalAlertId: data.alertId,
    service: data.service,
    severity: data.severity,
    type: data.type,
    title: data.title,
    message: data.message,
    source: "webhook",
    detectedAt: data.detectedAt || data.timestamp ? new Date((data.detectedAt || data.timestamp)!) : new Date(),
    startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
    metadata: data.metadata,
  });

  res.status(201).json({
    success: true,
    incident,
  });
});