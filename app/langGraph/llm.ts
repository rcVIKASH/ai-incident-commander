import { ChatGroq } from "@langchain/groq";
import { ChatOpenRouter } from "@langchain/openrouter";
import { Embeddings } from "@langchain/core/embeddings";

export class OpenRouterEmbeddings extends Embeddings {
  model: string;
  apiKey: string;

  constructor(fields?: { model?: string; apiKey?: string; maxConcurrency?: number; maxRetries?: number }) {
    super({ maxConcurrency: fields?.maxConcurrency, maxRetries: fields?.maxRetries });
    this.model = fields?.model ?? "nvidia/llama-nemotron-embed-vl-1b-v2:free";
    this.apiKey = fields?.apiKey ?? process.env.OPENROUTER_API_KEY ?? "";
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        input: documents
      })
    });
    if (!res.ok) {
      throw new Error(`OpenRouter embeddings error: ${res.statusText} - ${await res.text()}`);
    }
    const data = await res.json();
    return data.data.map((item: any) => item.embedding);
  }

  async embedQuery(document: string): Promise<number[]> {
    const docs = await this.embedDocuments([document]);
    return docs[0];
  }
}

export const model1 = new ChatGroq({
  model: "openai/gpt-oss-120b",
  apiKey: process.env.GROQ_API_KEY,
});

export const model2 = new ChatGroq({
  model: "openai/gpt-oss-20b",
  apiKey: process.env.GROQ_API_KEY,
});

export const model3 = new ChatGroq({
  model: "qwen/qwen3.6-27b",
  apiKey: process.env.GROQ_API_KEY,
});

export const model4 = new ChatOpenRouter({
  model: "nvidia/nemotron-3-ultra-550b-a55b:free",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const embeddingModel = new OpenRouterEmbeddings({
  model: "nvidia/llama-nemotron-embed-vl-1b-v2:free",
  apiKey: process.env.OPENROUTER_API_KEY,
});
