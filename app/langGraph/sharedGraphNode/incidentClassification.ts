import { START, END, StateGraph } from "@langchain/langgraph";
import { model1 } from "../llm.js";
import { IncidentState, IncidentStateType } from "../state/incidentState.js";
import {
  incidentClassificationSchema,
  IncidentClassification,
} from "../../validators/incidentClassification.validation.js";

// --------------------------------------------------
// Structured Model
// --------------------------------------------------
const structuredModel = model1.withStructuredOutput(
  incidentClassificationSchema,
);

// --------------------------------------------------
// Classification Node
// --------------------------------------------------
const classifyIncident = async (
  state: IncidentStateType,
): Promise<Partial<IncidentStateType>> => {
  const incident = state.incident;

  if (!incident) {
    return {
      error: "Missing incident payload in state",
    };
  }

  try {
    const result = await structuredModel.invoke([
      {
        role: "system",
        content: `
You are an AI Incident Classification Agent for AI Incident Commander.

Your responsibility is to classify and summarize the incoming incident while preserving important factual information from the original alert.

Answer:

"What kind of incident is this, and what important evidence does the alert contain?"

Determine:

1. incidentType
   - APPLICATION_ERROR
   - DATABASE_ERROR
   - INFRASTRUCTURE_ERROR
   - NETWORK_ERROR
   - SECURITY_INCIDENT
   - DEPLOYMENT_FAILURE
   - PERFORMANCE_DEGRADATION
   - UNKNOWN

2. severity
   - LOW
   - MEDIUM
   - HIGH
   - CRITICAL

3. service
   - Use the EXACT service name provided in the input.
   - Never replace it with another service.

4. summary
   - Give a concise but information-rich summary.
   - Preserve important facts such as:
     thresholds, measured values, duration, region,
     error messages, status codes, affected endpoints,
     deployment versions, or other relevant metadata.

5. confidence
   - Value between 0.0 and 1.0.

6. likelyCategory
   - Specific sub-category when supported by the alert.
   - Examples:
     API_LATENCY
     API_FAILURE
     DATABASE_CONNECTION
     AUTH_FAILURE
     MEMORY_EXHAUSTION
     DEPLOYMENT_REGRESSION

7. reasoning
   - Briefly explain which evidence from the alert supports the classification.
   - Do not introduce facts that are not present in the alert.

8. tags
   - Extract useful keywords from the incident.
   - Only use tags supported by the input.

9. keySignals
   - Extract important factual values from the alert.
   - Examples:
     latencyMs
     thresholdMs
     duration
     region
     errorRate
     statusCode
     endpoint
     deploymentVersion
   - Preserve the original values whenever possible.
   - Do NOT invent missing values.

IMPORTANT RULES:

- Preserve factual information from the original incident.
- The original incident is the source of truth.
- Do not change the service name.
- Do not invent affected users, failures, root causes, endpoints, systems, or symptoms.
- Do not assume that a latency spike caused failures unless the alert explicitly says so.
- Do not assume an API, database, login system, or other component unless the input supports it.
- Do not diagnose root cause.
- Do not suggest remediation.
- Do not execute actions.
- If information is missing, leave it unknown rather than guessing.
- Prefer evidence from the input over assumptions.

Your output should provide useful classification information for a downstream diagnosis agent.
`.trim(),
      },
      {
        role: "user",
        content: JSON.stringify(incident),
      },
    ]);

    return {
      classification: result as IncidentClassification,
    };
  } catch (err: any) {
    return {
      error: err?.message || "Failed to classify incident",
    };
  }
};

// --------------------------------------------------
// Classification Subgraph
// --------------------------------------------------
const graph = new StateGraph(IncidentState)
  .addNode("classifyIncident", classifyIncident)
  .addEdge(START, "classifyIncident")
  .addEdge("classifyIncident", END);

export const incidentClassification = graph.compile();
