import dotenv from "dotenv";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";

dotenv.config();

const githubToken = process.env.GITHUB_TOKEN;
if (!githubToken) {
  throw new Error("GITHUB_TOKEN is not defined");
}

const client = new Client({
  name: "ai-incident-commander",
  version: "1.0.0",
});

const transport = new StreamableHTTPClientTransport(
  new URL("https://api.githubcopilot.com/mcp/"),
  {
    requestInit: {
      headers: {
        Authorization: `Bearer ${githubToken}`,
      },
    },
  },
);

console.log("Connecting to GitHub MCP...");

await client.connect(transport);

console.log("✅ Connected to GitHub MCP");

const { tools } = await client.listTools();
