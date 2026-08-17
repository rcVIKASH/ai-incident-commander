import "dotenv/config";
import { mainGraph } from "./mainGraph.js";
import { evidenceCollector } from "./evidenceGraphNode/evidenceCollector.js";
import { seedDemoTelemetry } from "../telemetry/demoCustomerApp.js";

async function testGraphNode() {
  console.log("--------------------------------------------------");
  console.log("🚀 Testing LangGraph + PostgreSQL Telemetry Provider (commander_telemetry)");
  console.log("--------------------------------------------------\n");

  // 1. Seed correlated telemetry in PostgreSQL database
  const { organizationId } = await seedDemoTelemetry();

  const sampleIncident = {
    incidentId: "inc-payment-db-timeout-101",
    organizationId,
    alertId: "alert-otel-202",
    service: "payment-gateway",
    environment: "production",
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

  console.log("\n📥 1. Sample Alert Input:");
  console.log(JSON.stringify(sampleIncident, null, 2));

  console.log("\n⚡ 2. Testing Standalone LLM-Driven Evidence Collector Subgraph (Postgres Provider):");
  try {
    const evidenceResult = await evidenceCollector.invoke({
      incident: sampleIncident,
    });
    console.log("✅ Processed Telemetry Evidence Summary from PostgreSQL:");
    console.log(evidenceResult.processedEvidence?.summaryText);
  } catch (err: any) {
    console.error("❌ Evidence Collector Error:", err.message);
  }

  console.log("\n🔄 3. Full Main Graph Invoke (Classification -> Postgres Telemetry Agent -> Postgres Checkpointer):");
  const config = {
    configurable: {
      thread_id: `${organizationId}:${sampleIncident.incidentId}`,
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

    console.log("\n--- Calculated Telemetry Summary from PostgreSQL ---");
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
