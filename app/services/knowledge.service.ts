import { ingestToRAG, retrieveFromRAG } from "../langGraph/rag/rag.js";
import { RetrievedKnowledge, IngestDocumentInput, RetrieveOptions, IngestResult } from "../types/rag.js";

export class KnowledgeService {
    /**
     * Ingest a document into the Knowledge base.
     */
    async ingestDocument(input: IngestDocumentInput): Promise<IngestResult> {
        try {
            const result = await ingestToRAG(input.document, input.metadata);
            return {
                success: true,
                chunks: result.chunks
            };
        } catch (error) {
            console.error("Failed to ingest document:", error);
            throw error;
        }
    }

    /**
     * Retrieve knowledge from the Vector DB based on a query and metadata filters.
     */
    async retrieveKnowledge(query: string, options: RetrieveOptions): Promise<RetrievedKnowledge[]> {
        try {
            const results = await retrieveFromRAG(query, options.companyId, options.service, options.limit);
            
            const retrievedKnowledge: RetrievedKnowledge[] = [];
            
            const docs = results.documents[0] || [];
            const metadatas = results.metadatas[0] || [];
            const distances = results.distances?.[0] || [];
            
            for (let i = 0; i < docs.length; i++) {
                const doc = docs[i];
                const meta = metadatas[i] as any;
                const dist = distances[i] ?? undefined;
                
                if (doc !== null && meta) {
                    retrievedKnowledge.push({
                        content: doc,
                        source: meta.fileName || "unknown",
                        score: dist,
                        metadata: {
                            companyId: meta.companyId,
                            documentType: meta.documentType,
                            service: meta.service,
                            documentId: meta.documentId
                        }
                    });
                }
            }
            
            return retrievedKnowledge;
        } catch (error) {
            console.error("Failed to retrieve knowledge:", error);
            throw error;
        }
    }
}

export const knowledgeService = new KnowledgeService();
