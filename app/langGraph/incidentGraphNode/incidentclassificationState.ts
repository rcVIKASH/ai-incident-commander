import { Annotation } from "@langchain/langgraph";
import { IncidentClassification } from "../../validators/incidentClassification.validation.js";

export interface IncidentInput {
  service: string;
  message: string;
  environment?: string;
  severity?: string;
  timestamp?: string;
  telemetryWindowStart?: string;
  telemetryWindowEnd?: string;
  title?: string;
  alertId?: string;
  incidentId?: string;
  organizationId?: string;
  type?: string;
  metadata?: Record<string, any>;
}

/**
 * Dedicated State schema for the Incident Classification subgraph node
 */
export const ClassificationState = Annotation.Root({
  incident: Annotation<IncidentInput>(),
  classification: Annotation<IncidentClassification | undefined>(),
  error: Annotation<string | undefined>(),
});

export type ClassificationStateType = typeof ClassificationState.State;
