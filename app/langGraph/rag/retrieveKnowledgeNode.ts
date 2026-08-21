import { MainStateType } from "../mainState.js";
import { knowledgeService } from "../../services/knowledge.service.js";

// Temporary placeholder for auth. Same as controller for now.
const DEFAULT_COMPANY_ID = "company-demo";

export const retrieveKnowledgeNode = async (state: MainStateType): Promise<Partial<MainStateType>> => {
    console.log("--- NODE: retrieveKnowledge ---");
    
    const { incident, classification, processedEvidence } = state;
    
    if (!incident) {
        console.warn("No incident provided to retrieveKnowledgeNode");
        return { retrievedKnowledge: [] };
    }

    // Construct query from incident, classification, and evidence
    const queryParts = [incident.message];
    if (classification?.incidentType) {
        queryParts.push(`Classification: ${classification.incidentType}`);
    }
    if (processedEvidence?.summaryText) {
        queryParts.push(`Evidence: ${processedEvidence.summaryText}`);
    }
    
    const query = queryParts.join("\n\n");
    console.log("Constructed Query for RAG:", query);

    try {
        const retrievedKnowledge = await knowledgeService.retrieveKnowledge(query, {
            companyId: DEFAULT_COMPANY_ID,
            service: incident.service,
            limit: 3
        });
        
        console.log(`Retrieved ${retrievedKnowledge.length} documents from RAG.`);
        
        return { retrievedKnowledge };
    } catch (error) {
        console.error("Error retrieving knowledge:", error);
        return { retrievedKnowledge: [] }; // Proceed gracefully even if RAG fails
    }
};
