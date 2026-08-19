import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { IncidentInput } from "../incidentGraphNode/incidentclassificationState.js";
import { IncidentClassification } from "../../validators/incidentClassification.validation.js";
import { ProcessedEvidence } from "../../types/evidence.js";
import { DeploymentRecord, DeploymentSummary } from "../../types/deployment.js";

/**
 * Dedicated State schema for the Deployment Evidence subgraph node (deployEvidence)
 */
export const DeploymentState = Annotation.Root({
  ...MessagesAnnotation.spec,
  incident: Annotation<IncidentInput>(),
  classification: Annotation<IncidentClassification | undefined>(),
  processedEvidence: Annotation<ProcessedEvidence | undefined>(),
  rawDeployments: Annotation<DeploymentRecord[] | undefined>(),
  deploymentSummary: Annotation<DeploymentSummary | undefined>(),
  error: Annotation<string | undefined>(),
});

export type DeploymentStateType = typeof DeploymentState.State;
