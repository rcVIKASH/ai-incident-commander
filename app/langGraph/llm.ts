import { ChatGroq } from "@langchain/groq";

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
