import {
  START,
  END,
  StateGraph,
} from "@langchain/langgraph";

import { checkpointer } from "./config/vectorDB.js";
import { IncidentState } from "./state/incidentState.js";
import { incidentClassification } from "./sharedGraphNode/incidentClassification.js";

const graph = new StateGraph(IncidentState)
  .addNode("incidentClassification", incidentClassification)
  .addEdge(START, "incidentClassification")
  .addEdge("incidentClassification", END);


export const mainGraph = graph.compile({ checkpointer });