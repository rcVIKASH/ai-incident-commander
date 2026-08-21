import "dotenv/config";
import { chunkMarkdown } from "./chunking/chunkMD.js";
import { generateEmbeddings } from "./embedding/embedding.js";
import { client as chromaClient } from "./ragvectorDB/vector.js";
import { embeddingModel } from "../llm.js";

// Metadata interface for ingestion
export interface RAGMetadata {
    companyId: string;
    documentId: string;
    fileName: string;
    documentType: string;
    service?: string;
}

export async function ingestToRAG(document: string, metadata: RAGMetadata) {
    console.log(`[RAG Engine] Chunking document ${metadata.fileName}...`);
    const chunks = await chunkMarkdown(document);
    
    // Create metadata for each chunk
    const metadatas = chunks.map((_, index) => {
        const meta: any = {
            companyId: metadata.companyId,
            documentId: metadata.documentId,
            fileName: metadata.fileName,
            documentType: metadata.documentType,
            chunkIndex: index
        };
        if (metadata.service) {
            meta.service = metadata.service;
        }
        return meta;
    });
    
    // Create unique IDs for each chunk
    const ids = chunks.map((_, index) => `${metadata.documentId}_chunk_${index}`);
    
    console.log(`[RAG Engine] Generating embeddings for ${chunks.length} chunks...`);
    const embeddings = await generateEmbeddings(chunks);
    
    console.log(`[RAG Engine] Storing in ChromaDB...`);
    const collection = await chromaClient.getOrCreateCollection({
        name: "incident_commander_knowledge"
    });
    
    await collection.add({
        ids: ids,
        embeddings: embeddings,
        metadatas: metadatas,
        documents: chunks
    });
    
    console.log(`[RAG Engine] Successfully stored document ${metadata.documentId}.`);
    return { chunks: chunks.length };
}

export async function retrieveFromRAG(query: string, companyId: string, service?: string, limit: number = 5) {
    console.log(`[RAG Engine] Embedding query: "${query}"`);
    const queryEmbedding = await embeddingModel.embedQuery(query);
    
    const collection = await chromaClient.getOrCreateCollection({
        name: "incident_commander_knowledge"
    });
    
    // Construct where clause for metadata filtering
    let where: any = undefined;
    if (service) {
        // If we have both companyId and service, Chroma uses an $and operator
        where = {
            $and: [
                { companyId: { $eq: companyId } },
                { service: { $eq: service } }
            ]
        };
    } else {
        where = { companyId: { $eq: companyId } };
    }
    
    console.log(`[RAG Engine] Searching ChromaDB...`);
    const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit,
        where: where
    });
    
    return results;
}
