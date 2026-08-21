import { MainStateType } from "../mainState.js";
import { model4 } from "../llm.js"; // Standard GPT-4o or Claude model

export const analyzeIncident = async (state: MainStateType): Promise<Partial<MainStateType>> => {
    console.log("\n--- NODE: analyzeIncident ---");

    const { incident, classification, processedEvidence, deploymentSummary, retrievedKnowledge } = state;

    if (!incident) {
        console.warn("No incident provided to analyzeIncident node");
        return {};
    }

    // Format Live Evidence
    const liveEvidenceText = processedEvidence?.summaryText 
        ? processedEvidence.summaryText 
        : "No live evidence available.";

    // Format Deployment Evidence
    const deploymentEvidenceText = deploymentSummary?.summaryText
        ? deploymentSummary.summaryText
        : "No recent deployments detected.";

    // Format Historical/Company Knowledge (RAG)
    const ragKnowledgeText = retrievedKnowledge && retrievedKnowledge.length > 0
        ? retrievedKnowledge.map((k, i) => `[Source: ${k.source} - Score: ${k.score}]\n${k.content}`).join("\n\n")
        : "No relevant historical knowledge found.";

    console.log(`\n🧠 [Analysis] Integrating Live Evidence + RAG Knowledge for ${incident.service}`);

    const prompt = `You are an AI Incident Commander analyzing an ongoing incident.
    
# Incident Details
Service: ${incident.service}
Description: ${incident.message}
Classification: ${classification?.incidentType || "Unknown"}

# Live Telemetry Evidence
${liveEvidenceText}

# Recent Deployments
${deploymentEvidenceText}

# Historical Company Knowledge (Runbooks, Past Incidents)
${ragKnowledgeText}

Please provide a brief root cause analysis hypothesis and recommended next steps based on the combination of the live evidence and the historical knowledge.`;

    try {
        const response = await model4.invoke(prompt);
        console.log("\n>>> LLM Analysis >>>");
        console.log(response.content);
        console.log("<<<<<<<<<<<<<<<<<<<<");

        // Here we could add an 'analysisResult' to the state if needed
        return {};
    } catch (error) {
        console.error("Error generating analysis:", error);
        return { error: "Failed to generate incident analysis" };
    }
};
