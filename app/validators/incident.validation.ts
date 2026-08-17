import z from "zod";

export const incidentSchema = z.object({
  organizationId: z.string(),
  externalAlertId: z.string().optional(),
  service: z.string(),
  environment: z.string().optional(),
  severity: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string().optional(),
  status: z
    .enum([
      "RECEIVED",
      "INVESTIGATING",
      "WAITING_FOR_APPROVAL",
      "ACTION_PENDING",
      "RESOLVED",
      "FAILED",
      "CLOSED",
    ])
    .optional(),
  source: z.string(),
  detectedAt: z.union([z.string(), z.date()]).optional(),
  startedAt: z.union([z.string(), z.date()]).optional(),
  telemetryWindowStart: z.union([z.string(), z.date()]).optional(),
  telemetryWindowEnd: z.union([z.string(), z.date()]).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type IncidentCreateInput = z.infer<typeof incidentSchema>;