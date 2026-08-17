import z from "zod";

export const incidentWebhookSchema = z.object({
  alertId: z.string(),
  service: z.string(),
  environment: z.string().optional(),
  severity: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string().optional(),
  detectedAt: z.union([z.string(), z.date()]).optional(),
  startedAt: z.union([z.string(), z.date()]).optional(),
  timestamp: z.union([z.string(), z.date()]).optional(),
  telemetryWindowStart: z.union([z.string(), z.date()]).optional(),
  telemetryWindowEnd: z.union([z.string(), z.date()]).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type IncidentWebhookInput = z.infer<typeof incidentWebhookSchema>;
