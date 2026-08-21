import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { IncidentInput } from "./incidentGraphNode/incidentclassificationState.js";
import { IncidentClassification } from "../validators/incidentClassification.validation.js";
import { RawEvidence, ProcessedEvidence } from "../types/evidence.js";
import { DeploymentRecord, DeploymentSummary } from "../types/deployment.js";

import { RetrievedKnowledge } from "../types/rag.js";

/**
 * Main Central State schema for the root AI Incident Commander graph (mainGraph)
 * Aggregates and orchestrates shared state keys passed between subgraphs
 */
export const MainState = Annotation.Root({
  ...MessagesAnnotation.spec,
  incident: Annotation<IncidentInput>(),
  classification: Annotation<IncidentClassification | undefined>(),
  rawEvidence: Annotation<RawEvidence | undefined>(),
  processedEvidence: Annotation<ProcessedEvidence | undefined>(),
  rawDeployments: Annotation<DeploymentRecord[] | undefined>(),
  deploymentSummary: Annotation<DeploymentSummary | undefined>(),
  retrievedKnowledge: Annotation<RetrievedKnowledge[] | undefined>(),
  error: Annotation<string | undefined>(),
});

export type MainStateType = typeof MainState.State;

