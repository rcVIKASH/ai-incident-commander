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
  incidentClassificationSchema
);

// --------------------------------------------------
// Classification Node
// --------------------------------------------------
const classifyIncident = async (
  state: IncidentStateType
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

Your ONLY responsibility is to classify the incoming incident:

"What kind of incident is this?"

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
   - affected service name

4. summary
   - clear summary of what happened

5. confidence
   - value between 0.0 and 1.0

6. likelyCategory
   - optional sub-category
   - examples: API_FAILURE, AUTH_DOWN

7. reasoning
   - brief explanation for this classification

DO NOT:
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