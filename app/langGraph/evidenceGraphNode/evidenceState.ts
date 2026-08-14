import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { IncidentInput } from "../incidentGraphNode/incidentclassificationState.js";
import { IncidentClassification } from "../../validators/incidentClassification.validation.js";
import { RawEvidence, ProcessedEvidence } from "../../types/evidence.js";

/**
 * Dedicated State schema for the Evidence Collector subgraph node.
 * Includes `messages` for the LLM ↔ ToolNode conversation loop.
 */
export const EvidenceState = Annotation.Root({
  ...MessagesAnnotation.spec,
  incident: Annotation<IncidentInput>(),
  classification: Annotation<IncidentClassification | undefined>(),
  rawEvidence: Annotation<RawEvidence | undefined>(),
  processedEvidence: Annotation<ProcessedEvidence | undefined>(),
  error: Annotation<string | undefined>(),
});

export type EvidenceStateType = typeof EvidenceState.State;

