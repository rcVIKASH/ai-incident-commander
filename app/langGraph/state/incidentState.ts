import { Annotation } from "@langchain/langgraph";
import { IncidentClassification } from "../../validators/incidentClassification.validation.js";

export interface IncidentInput {
  service: string;
  message: string;
  timestamp?: string;
  severity?: string;
}

export const IncidentState = Annotation.Root({
  incident: Annotation<IncidentInput>(),
  classification: Annotation<IncidentClassification | undefined>(),
  error: Annotation<string | undefined>(),
});

export type IncidentStateType = typeof IncidentState.State;
