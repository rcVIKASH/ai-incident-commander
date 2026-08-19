import {
  START,
  END,
  StateGraph,
} from "@langchain/langgraph";

import { checkpointer } from "./config/vectorDB.js";
import { MainState } from "./mainState.js";
import { incidentClassification } from "./incidentGraphNode/incidentClassification.js";
import { evidenceCollector } from "./evidenceGraphNode/evidenceCollector.js";
import { deployEvidence } from "./deploymentGraphNode/deployEvidence.js";

const graph = new StateGraph(MainState)
  .addNode("incidentClassification", incidentClassification)
  .addNode("evidenceCollector", evidenceCollector)
  .addNode("deployEvidence", deployEvidence)
  .addEdge(START, "incidentClassification")
  .addEdge("incidentClassification", "evidenceCollector")
  .addEdge("evidenceCollector", "deployEvidence")
  .addEdge("deployEvidence", END);

export const mainGraph = graph.compile({ checkpointer });