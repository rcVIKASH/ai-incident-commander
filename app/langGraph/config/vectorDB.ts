import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const connectionString = process.env.VECTOR_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "VECTOR_DATABASE_URL is not defined in environment variables",
  );
}

export const checkpointer = PostgresSaver.fromConnString(connectionString);

// await checkpointer.setup();