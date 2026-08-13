import { Annotation } from "@langchain/langgraph";
import { IncidentClassification } from "../../validators/incidentClassification.validation.js";

export interface IncidentInput {
  service: string;
  message: string;
  severity?: string;
  timestamp?: string;
  title?: string;
  alertId?: string;
  type?: string;
  metadata?: Record<string, any>;
}

export const IncidentState = Annotation.Root({
  incident: Annotation<IncidentInput>(),
  classification: Annotation<IncidentClassification | undefined>(),
  error: Annotation<string | undefined>(),
});

export type IncidentStateType = typeof IncidentState.State;
