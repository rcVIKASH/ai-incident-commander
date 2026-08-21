import "dotenv/config";
import { readFileSync } from "fs";
import path from "path";
import { chunkMarkdown } from "./chunking/chunkMD.js";
import { generateEmbeddings } from "./embedding/embedding.js";
import { client as chromaClient } from "./ragvectorDB/vector.js";
import { embeddingModel, model4 } from "../llm.js";




async function runRAG() {
    try {
        console.log("==========================================");
        console.log("1. Reading document...");
        console.log("==========================================");
        const documentPath = path.join(process.cwd(), "app/langGraph/rag/documents/walkthrough.md");
        const document = readFileSync(documentPath, "utf-8");
        
        console.log("\n==========================================");
        console.log("2. Chunking document...");
        console.log("==========================================");
        const chunks = await chunkMarkdown(document);
        console.log(`Successfully generated ${chunks.length} chunks from the markdown file.`);

        console.log("\n==========================================");
        console.log("3. Generating metadata...");
        console.log("==========================================");
        // Create metadata for each chunk to store alongside them
        const metadatas = chunks.map((_, index) => ({
            source: "walkthrough.md",
            chunkIndex: index
        }));
        // Create unique IDs for each chunk
        const ids = chunks.map((_, index) => `doc_walkthrough_chunk_${index}`);
        console.log(`Generated metadata and IDs for ${chunks.length} chunks.`);

        console.log("\n==========================================");
        console.log("4. Generating embeddings...");
        console.log("==========================================");
        // Pass the chunks to the embedding model
        const embeddings = await generateEmbeddings(chunks);
        console.log(`Generated ${embeddings.length} embeddings.`);

        console.log("\n==========================================");
        console.log("5. Storing in ChromaDB...");
        console.log("==========================================");
        // Get or create a collection in ChromaDB
        const collection = await chromaClient.getOrCreateCollection({
            name: "walkthrough_collection"
        });
        
        // Add chunks to the vector database
        await collection.add({
            ids: ids,
            embeddings: embeddings,
            metadatas: metadatas,
            documents: chunks
        });
        console.log("Successfully stored chunks, metadata, and embeddings in ChromaDB.");

        console.log("\n==========================================");
        console.log("6. Similarity Search");
        console.log("==========================================");
        const query = "What is the incident commander?";
        console.log(`Query: "${query}"`);
        
        // Embed the query
        const queryEmbedding = await embeddingModel.embedQuery(query);
        
        // Search the collection
        const results = await collection.query({
            queryEmbeddings: [queryEmbedding],
            nResults: 3
        });
        
        console.log("Search completed. Retrieved contexts:");
        const retrievedDocs = results.documents[0] || [];
        retrievedDocs.forEach((doc, idx) => {
            console.log(`\n--- Match ${idx + 1} ---`);
            console.log(doc ? doc.substring(0, 150) + "..." : "No content");
        });

        console.log("\n==========================================");
        console.log("7. Generating response with LLM (model4)...");
        console.log("==========================================");
        // Combine the retrieved documents into a single context string
        const context = retrievedDocs.filter(doc => doc !== null).join("\n\n");
        
        // Create the prompt with context and query
        const prompt = `Use the following context to answer the question.\n\nContext:\n${context}\n\nQuestion: ${query}\n\nAnswer:`;
        
        // Call the LLM
        const response = await model4.invoke(prompt);
        console.log("\n>>> LLM RESPONSE >>>");
        console.log(response.content);
        console.log("<<<<<<<<<<<<<<<<<<<<");

    } catch (error) {
        console.error("An error occurred during the RAG pipeline:", error);
    }
}

// Run the pipeline
runRAG();
