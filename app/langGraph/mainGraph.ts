import {
  START,
  END,
  StateGraph,
} from "@langchain/langgraph";

import { checkpointer } from "./config/vectorDB.js";
import { MainState } from "./mainState.js";
import { incidentClassification } from "./incidentGraphNode/incidentClassification.js";
import { evidenceCollector } from "./evidenceGraphNode/evidenceCollector.js";

const graph = new StateGraph(MainState)
  .addNode("incidentClassification", incidentClassification)
  .addNode("evidenceCollector", evidenceCollector)
  .addEdge(START, "incidentClassification")
  .addEdge("incidentClassification", "evidenceCollector")
  .addEdge("evidenceCollector", END);

export const mainGraph = graph.compile({ checkpointer });