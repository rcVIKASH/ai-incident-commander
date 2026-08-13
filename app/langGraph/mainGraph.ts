import {
  START,
  END,
  StateGraph,
} from "@langchain/langgraph";

import { checkpointer } from "./config/vectorDB.js";
import { IncidentState } from "./state/incidentState.js";
import { incidentClassification } from "./sharedGraphNode/incidentClassification.js";

const graph = new StateGraph(IncidentState)
  .addNode("incidentClassification", async (state) => {
    if (!state.incident) {
      return {
        error: "Missing incident payload in state",
      };
    }

    try {
      const classification = await incidentClassification(state.incident);
      return {
        classification,
      };
    } catch (err: any) {
      return {
        error: err?.message || "Failed to classify incident",
      };
    }
  })
  .addEdge(START, "incidentClassification")
  .addEdge("incidentClassification", END);


export const mainGraph = graph.compile({ checkpointer });