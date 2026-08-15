import "dotenv/config";
import { model1, model2, model3, model4 } from "./dist/langGraph/llm.js";

console.log("--------------------------------------------------");
console.log("🧪 Testing LLM Model Connections");
console.log("--------------------------------------------------\n");

async function testModel(name, model) {
  try {
    const modelName = model.model || model.modelName || "unknown";

    console.log(`👉 Testing ${name} (${modelName})...`);

    const start = Date.now();

    const response = await model.invoke([
      {
        role: "user",
        content:
          "Hello! Reply with one short sentence confirming you are active.",
      },
    ]);

    const duration = Date.now() - start;

    const content =
      typeof response.content === "string"
        ? response.content.trim()
        : JSON.stringify(response.content);

    console.log(`✅ ${name} Success (${duration}ms):`);
    console.log(`   "${content}"\n`);
  } catch (err) {
    console.error(`❌ ${name} Error`);

    console.error(`   Message: ${err?.message || "Unknown error"}`);

    // Show provider information if available
    if (err?.response) {
      console.error(`   Response:`, err.response);
    }

    if (err?.metadata) {
      console.error(`   Metadata:`, err.metadata);
    }

    console.error("");
  }
}

// Groq
await testModel("model1 (Groq GPT-OSS 120B)", model1);

await testModel("model2 (Groq GPT-OSS 20B)", model2);

await testModel("model3 (Groq Qwen 3.6 27B)", model3);

// OpenRouter
await testModel("model4 (OpenRouter NVIDIA Nemotron)", model4);

console.log("--------------------------------------------------");
console.log("🏁 Testing Complete");
console.log("--------------------------------------------------");
