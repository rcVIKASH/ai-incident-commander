import z from "zod";

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
 * Schema for structured incident classification output
 */
export const incidentClassificationSchema = z.object({
  incidentType: incidentTypeSchema.describe(
    "High-level classification of what kind of incident this is",
  ),

  severity: incidentSeveritySchema.describe(
    "Severity level of the incident: LOW, MEDIUM, HIGH, or CRITICAL",
  ),

  service: z
    .string()
    .min(1, "Service name is required")
    .trim()
    .describe("The exact affected service name from the input"),

  summary: z
    .string()
    .min(1, "Summary is required")
    .trim()
    .describe(
      "Concise but information-rich summary preserving important facts from the alert",
    ),

  confidence: z
    .number()
    .min(0, "Confidence must be at least 0")
    .max(1, "Confidence must be at most 1")
    .describe("Confidence score between 0.0 and 1.0"),

  likelyCategory: z
    .string()
    .trim()
    .optional()
    .describe(
      "Specific sub-category such as API_LATENCY, DATABASE_CONNECTION, AUTH_FAILURE",
    ),

  reasoning: z
    .string()
    .trim()
    .optional()
    .describe("Brief evidence-based explanation for the classification"),

  tags: z
    .array(z.string())
    .default([])
    .describe("Useful keywords for downstream filtering"),

  keySignals: z
    .record(z.string(), z.any())
    .default({})
    .describe(
      "Important factual signals extracted directly from the alert, such as latency, threshold, duration, region, error rate, status code, affected endpoint, or deployment version. Do not invent values.",
    ),
});

export type IncidentClassification = z.infer<
  typeof incidentClassificationSchema
>;

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
