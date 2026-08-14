import "dotenv/config";
import { mainGraph } from "./mainGraph.js";
import { evidenceCollector } from "./evidenceGraphNode/evidenceCollector.js";

async function testGraphNode() {
  console.log("--------------------------------------------------");
  console.log("🚀 Testing LangGraph Incident Classification + LLM-Driven Evidence Collector");
  console.log("--------------------------------------------------\n");

  const sampleIncident = {
    alertId: "alert-otel-202",
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

  console.log("\n⚡ 2. Testing LLM-Driven Evidence Collector Subgraph (LLM selects tools):");
  try {
    const evidenceResult = await evidenceCollector.invoke({
      incident: sampleIncident,
    });
    console.log("✅ Processed Telemetry Evidence Summary:");
    console.log(evidenceResult.processedEvidence?.summaryText);
  } catch (err: any) {
    console.error("❌ Evidence Collector Error:", err.message);
  }

  console.log("\n🔄 3. Full Main Graph Invoke (Classification -> LLM Evidence Agent -> Postgres Checkpointer):");
  const config = {
    configurable: {
      thread_id: `thread-otel-${Date.now()}`,
    },
  };

  try {
    const graphResult = await mainGraph.invoke(
      {
        incident: sampleIncident,
      },
      config
    );
    console.log("\n✅ Main Graph Execution Result:");
    console.log("\n--- Classification Output ---");
    console.dir(graphResult.classification, { depth: null });

    console.log("\n--- Calculated Telemetry Summary ---");
    console.log(graphResult.processedEvidence?.summaryText);

    console.log("\n🧠 4. Retrieving State from Postgres Checkpointer (Short-Term Memory):");
    const storedState = await mainGraph.getState(config);
    console.log("✅ Checkpointer State Stored Successfully!");
    console.log(`Thread ID: ${config.configurable.thread_id}`);
    console.log(`Next Nodes: ${storedState.next.length === 0 ? "END" : storedState.next.join(", ")}`);
  } catch (err: any) {
    console.error("❌ Main Graph Invoke Error:", err.message);
  }

  console.log("\n--------------------------------------------------");
}

testGraphNode();
