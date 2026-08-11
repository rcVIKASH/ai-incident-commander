import z from "zod";

export const incidentWebhookSchema = z.object({
  alertId: z.string(),
  service: z.string(),
  severity: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type IncidentWebhookInput = z.infer<typeof incidentWebhookSchema>;
