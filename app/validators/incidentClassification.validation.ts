import  z  from "zod";

export const INCIDENT_TYPES = [
  "APPLICATION_ERROR",
  "DATABASE_ERROR",
  "INFRASTRUCTURE_ERROR",
  "NETWORK_ERROR",
  "SECURITY_INCIDENT",
  "DEPLOYMENT_FAILURE",
  "PERFORMANCE_DEGRADATION",
  "UNKNOWN",
] as const;

export const INCIDENT_SEVERITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

export const incidentTypeSchema = z.enum(INCIDENT_TYPES);
export type IncidentType = z.infer<typeof incidentTypeSchema>;

export const incidentSeveritySchema = z.enum(INCIDENT_SEVERITIES);
export type IncidentSeverity = z.infer<typeof incidentSeveritySchema>;

/**
 * Schema for raw incoming incident alert input before processing
 */
export const rawIncidentAlertSchema = z.object({
  service: z.string().min(1, "Service name is required").trim(),
  severity: z.string().optional(),
  message: z.string().min(1, "Alert message is required").trim(),
  timestamp: z.string().or(z.date()).optional(),
  externalAlertId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type RawIncidentAlertInput = z.infer<typeof rawIncidentAlertSchema>;

/**
 * Schema for structured incident classification output from Step 1 Classifier
 */
export const incidentClassificationSchema = z.object({
  incidentType: incidentTypeSchema.describe("High-level classification of what kind of incident this is"),
  severity: incidentSeveritySchema.describe("Severity level of the incident: LOW, MEDIUM, HIGH, or CRITICAL"),
  service: z.string().min(1, "Service name is required").trim().describe("Target service name affected"),
  summary: z.string().min(1, "Summary is required").trim().describe("Brief description/summary of the incident"),
  confidence: z
    .number()
    .min(0, "Confidence must be at least 0")
    .max(1, "Confidence must be at most 1")
    .describe("Confidence score between 0.0 and 1.0"),
  likelyCategory: z.string().trim().optional().describe("More specific sub-category e.g. API_FAILURE, AUTH_DOWN"),
  reasoning: z.string().trim().optional().describe("Explanation for why AI classified the incident this way"),
  tags: z.array(z.string()).default([]).describe("Keywords or tags for downstream filtering"),
});

export type IncidentClassification = z.infer<typeof incidentClassificationSchema>;

/**
 * Safely validate structured incident classification data
 */
export function validateIncidentClassification(data: unknown) {
  return incidentClassificationSchema.safeParse(data);
}

/**
 * Safely validate raw incoming incident alert data
 */
export function validateRawIncidentAlert(data: unknown) {
  return rawIncidentAlertSchema.safeParse(data);
}
