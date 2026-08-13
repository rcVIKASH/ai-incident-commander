import "dotenv/config";
import { mainGraph } from "./mainGraph.js";
import { incidentClassification } from "./sharedGraphNode/incidentClassification.js";

async function testGraphNode() {
  console.log("--------------------------------------------------");
  console.log("🚀 Testing LangGraph Incident Classification Subgraph");
  console.log("--------------------------------------------------\n");

  const sampleIncident = {
    alertId: "alert-101",
    service: "payment-gateway",
    severity: "HIGH",
    type: "LATENCY_SPIKE",
    title: "Payment service high latency detected",
    message: "Response times exceeded 2000ms threshold for 5 consecutive minutes",
    timestamp: new Date().toISOString(),
    metadata: {
      latencyMs: 2450,
      region: "us-east-1",
    },
  };

  console.log("📥 1. Sample Alert Input:");
  console.log(JSON.stringify(sampleIncident, null, 2));

  console.log("\n⚡ 2. Standalone Subgraph Invoke (incidentClassification.invoke):");
  try {
    const directResult = await incidentClassification.invoke({
      incident: sampleIncident,
    });
    console.log("✅ Classification Subgraph Output:");
    console.dir(directResult, { depth: null });
  } catch (err: any) {
    console.error("❌ Classification Subgraph Error:", err.message);
  }

  console.log("\n🔄 3. Full Main Graph Invoke (mainGraph.invoke with Postgres Checkpointer / STM):");
  const config = {
    configurable: {
      thread_id: "thread-alert-101",
    },
  };

  try {
    const graphResult = await mainGraph.invoke(
      {
        incident: sampleIncident,
      },
      config
    );
    console.log("✅ Main Graph Execution Result:");
    console.dir(graphResult, { depth: null });

    console.log("\n🧠 4. Retrieving State from Postgres Checkpointer (Short-Term Memory):");
    const storedState = await mainGraph.getState(config);
    console.log("✅ Stored State from Postgres:");
    console.dir(storedState, { depth: null });
  } catch (err: any) {
    console.error("❌ Main Graph Invoke Error:", err.message);
  }

  console.log("\n--------------------------------------------------");
}

testGraphNode();
