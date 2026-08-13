import { model1 } from "../llm.js";
import {
  incidentClassificationSchema,
  IncidentClassification,
  validateRawIncidentAlert,
} from "../../validators/incidentClassification.validation.js";

// Use Zod schema object (NOT TS type) for structured model binding
const structuredModel = model1.withStructuredOutput(incidentClassificationSchema);

export async function incidentClassification(incident: {
  service: string;
  message: string;
  timestamp?: string;
  severity?: string;
}): Promise<IncidentClassification> {
  // Validate input alert
  const alertCheck = validateRawIncidentAlert(incident);
  if (!alertCheck.success) {
    throw new Error(`Invalid incident input payload: ${alertCheck.error.message}`);
  }

  const result = await structuredModel.invoke([
    {
      role: "system",
      content: `
You are an AI Incident Classification Agent for AI Incident Commander.

Your ONLY responsibility is to classify the incoming incident:
"What kind of incident is this?"

Determine:
1. incidentType (APPLICATION_ERROR, DATABASE_ERROR, INFRASTRUCTURE_ERROR, NETWORK_ERROR, SECURITY_INCIDENT, DEPLOYMENT_FAILURE, PERFORMANCE_DEGRADATION, or UNKNOWN)
2. severity (LOW, MEDIUM, HIGH, or CRITICAL)
3. service (affected service name)
4. summary (clear summary of what happened)
5. confidence (between 0.0 and 1.0)
6. likelyCategory (optional sub-category e.g. API_FAILURE, AUTH_DOWN)
7. reasoning (brief explanation for this classification)

Do NOT:
- diagnose root cause
- suggest remediation
- execute actions
- invent unverified details
      `.trim(),
    },
    {
      role: "user",
      content: JSON.stringify(incident),
    },
  ]);

  return result as IncidentClassification;
}