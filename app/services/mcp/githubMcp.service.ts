import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { IntegrationRepository } from "../integration.repository.js";
import { decryptIntegrationSecret } from "../encryption.service.js";

interface MCPToolCallArgs {
  organizationId: string;
  toolName: string;
  args: Record<string, any>;
}

export class GithubMcpService {
  /**
   * Connects to the Shared GitHub MCP Server securely for a given organization.
   * Creates a short-lived request-scoped MCP client.
   */
  private static async createScopedClient(organizationId: string) {
    // 1. Fetch organization integration
    const integration = await IntegrationRepository.getActiveGitHubIntegration(organizationId);

    if (!integration || !integration.accessTokenEncrypted) {
      throw new Error("GITHUB_NOT_CONNECTED: Organization has no active GitHub integration.");
    }

    // 2. Decrypt access token
    let accessToken: string;
    try {
      accessToken = decryptIntegrationSecret(integration.accessTokenEncrypted);
    } catch (err: any) {
      throw new Error("GITHUB_AUTH_FAILED: Failed to decrypt GitHub token.");
    }

    // 3. Configure shared server URL
    const serverUrl = process.env.GITHUB_MCP_SERVER_URL || "https://api.githubcopilot.com/mcp";

    // 4. Create the transport
    const transport = new StreamableHTTPClientTransport(new URL(serverUrl), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "ai-incident-commander/1.0.0",
          Accept: "application/json, text/event-stream",
        },
      },
    });

    // 5. Create client and connect
    const client = new Client({
      name: "ai-incident-commander",
      version: "1.0.0",
    }, {
      capabilities: {}
    });

    try {
      await client.connect(transport);
      return client;
    } catch (error: any) {
      throw new Error(`GITHUB_MCP_UNAVAILABLE: Failed to connect to MCP server: ${error.message}`);
    }
  }

  /**
   * Lists available tools from the GitHub MCP server for this organization.
   */
  static async listGitHubTools(organizationId: string) {
    let client;
    try {
      client = await this.createScopedClient(organizationId);
      const toolsResult = await client.listTools();
      return toolsResult.tools || [];
    } finally {
      if (client) {
        try {
          await client.close();
        } catch (e) {
          // ignore close errors
        }
      }
    }
  }

  /**
   * Calls a specific GitHub MCP tool on behalf of the organization.
   */
  static async callGitHubTool({ organizationId, toolName, args }: MCPToolCallArgs) {
    let client;
    try {
      client = await this.createScopedClient(organizationId);
      const result = await client.callTool({
        name: toolName,
        arguments: args,
      });

      if (result.isError) {
        throw new Error(`GitHub MCP Tool Error: ${JSON.stringify(result.content)}`);
      }

      return result.content;
    } catch (error: any) {
      console.error(`[MCP:GitHub] Tool call failed for org ${organizationId}:`, error?.message || error);
      throw error;
    } finally {
      if (client) {
        try {
          await client.close();
        } catch (e) {
          // ignore close errors
        }
      }
    }
  }
}
