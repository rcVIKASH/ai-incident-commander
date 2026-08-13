import "dotenv/config";
import { mainGraph } from "./mainGraph.js";
import { incidentClassification } from "./shared/incidentClassification.js";

async function testGraphNode() {
  console.log("--------------------------------------------------");
  console.log("🚀 Testing LangGraph Incident Classification Node");
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

  console.log("\n⚡ 2. Direct Function Call (incidentClassification):");
  try {
    const directResult = await incidentClassification(sampleIncident);
    console.log("✅ Classification Result:");
    console.dir(directResult, { depth: null });
  } catch (err: any) {
    console.error("❌ Direct Classification Error:", err.message);
  }

  console.log("\n🔄 3. Full LangGraph Invoke (mainGraph.invoke):");
  try {
    const graphResult = await mainGraph.invoke({
      incident: sampleIncident,
    });
    console.log("✅ Graph Execution Result:");
    console.dir(graphResult, { depth: null });
  } catch (err: any) {
    console.error("❌ LangGraph Invoke Error:", err.message);
  }

  console.log("\n--------------------------------------------------");
}

testGraphNode();
