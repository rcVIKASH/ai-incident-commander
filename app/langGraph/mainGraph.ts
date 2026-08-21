import {
  START,
  END,
  StateGraph,
} from "@langchain/langgraph";

import { checkpointer } from "./config/vectorDB.js";
import { MainState } from "./mainState.js";
import { incidentClassification } from "./incidentGraphNode/incidentClassification.js";
import { evidenceCollector } from "./evidenceGraphNode/evidenceCollector.js";
import { retrieveKnowledgeNode } from "./rag/retrieveKnowledgeNode.js";
import { deployEvidence } from "./deploymentGraphNode/deployEvidence.js";
import { analyzeIncident } from "./analysisGraphNode/analyzeIncident.js";

const graph = new StateGraph(MainState)
  .addNode("incidentClassification", incidentClassification)
  .addNode("evidenceCollector", evidenceCollector)
  .addNode("retrieveKnowledge", retrieveKnowledgeNode)
  .addNode("deployEvidence", deployEvidence)
  .addNode("analyzeIncident", analyzeIncident)
  .addEdge(START, "incidentClassification")
  .addEdge("incidentClassification", "evidenceCollector")
  .addEdge("evidenceCollector", "retrieveKnowledge")
  .addEdge("retrieveKnowledge", "deployEvidence")
  .addEdge("deployEvidence", "analyzeIncident")
  .addEdge("analyzeIncident", END);

export const mainGraph = graph.compile({ checkpointer });