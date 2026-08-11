import z from "zod";

export const incidentSchema = z.object({
  organizationId: z.string(),
  externalAlertId: z.string().optional(),
  service: z.string(),
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
  metadata: z.record(z.string(), z.any()).optional(),
});


export type IncidentCreateInput = z.infer<typeof incidentSchema>;