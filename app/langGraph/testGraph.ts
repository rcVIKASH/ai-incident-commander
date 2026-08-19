import "dotenv/config";
import { mainGraph } from "./mainGraph.js";
import { evidenceCollector } from "./evidenceGraphNode/evidenceCollector.js";
import { deployEvidence } from "./deploymentGraphNode/deployEvidence.js";
import { prisma } from "../db/config.js";

async function testGraphNode() {
  console.log("==================================================================");
  console.log("🚀 Testing LangGraph Pipeline with Dedicated deployEvidence Node");
  console.log("==================================================================\n");

  // Query existing organization directly from PostgreSQL database
  const existingOrg = await prisma.organization.findFirst();
  const organizationId = existingOrg?.id || "prod-org-id-001";

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

  console.log("📥 1. Sample Alert Input:");
  console.log(JSON.stringify(sampleIncident, null, 2));

  console.log("\n--------------------------------------------------");
  console.log("⚡ 2. Testing Standalone LLM-Driven Evidence Collector Subgraph (Postgres Telemetry):");
  try {
    const evidenceResult = await evidenceCollector.invoke({
      incident: sampleIncident,
    });
    console.log("✅ Processed Telemetry Evidence Summary from PostgreSQL:");
    console.log(evidenceResult.processedEvidence?.summaryText);
  } catch (err: any) {
    console.error("❌ Evidence Collector Error:", err.message);
  }

  console.log("\n--------------------------------------------------");
  console.log("📦 3. Testing Standalone deployEvidence Node:");
  try {
    const deployResult = await deployEvidence({
      incident: sampleIncident,
      messages: [],
    });
    console.log("✅ Processed Deployment Summary:");
    console.log(deployResult.deploymentSummary?.summaryText);
  } catch (err: any) {
    console.error("❌ deployEvidence Error:", err.message);
  }

  console.log("\n--------------------------------------------------");
  console.log("🔄 4. Full Main Graph Pipeline Invoke:");
  console.log("   (incidentClassification -> evidenceCollector -> deployEvidence -> Postgres Checkpointer)");
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
    console.log("\n--- A. Classification Output ---");
    console.dir(graphResult.classification, { depth: null });

    console.log("\n--- B. Telemetry Evidence Output ---");
    console.log(graphResult.processedEvidence?.summaryText);

    console.log("\n--- C. Deployment Evidence Output ---");
    console.log(graphResult.deploymentSummary?.summaryText);

    console.log("\n🧠 5. Retrieving State from Postgres Checkpointer (Short-Term Memory):");
    const storedState = await mainGraph.getState(config);
    console.log("✅ Checkpointer State Stored Successfully!");
    console.log(`Thread ID: ${config.configurable.thread_id}`);
    console.log(`Stored Deployment Version: ${storedState.values?.deploymentSummary?.latestVersion}`);
    console.log(`Suspicious Flag: ${storedState.values?.deploymentSummary?.suspiciousChangeFlag}`);
    console.log(`Next Nodes: ${storedState.next.length === 0 ? "END" : storedState.next.join(", ")}`);
  } catch (err: any) {
    console.error("❌ Main Graph Invoke Error:", err.message);
  }

  console.log("\n==================================================================");
}

testGraphNode();

