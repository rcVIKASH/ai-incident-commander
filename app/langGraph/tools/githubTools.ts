import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { GithubMcpService } from "../../services/mcp/githubMcp.service.js";

/**
 * Normalizes GitHub MCP evidence into a standardized format.
 */
function normalizeGitHubEvidence(rawData: any, type: string) {
  return {
    source: "github",
    type,
    timestamp: new Date().toISOString(),
    summary: `Fetched ${type} from GitHub MCP`,
    rawData,
  };
}

/**
 * Tool: Fetch recent GitHub commits for a given repository.
 */
export function createGetRecentCommitsTool(organizationId: string) {
  return tool(
    async (input) => {
      try {
        const result = await GithubMcpService.callGitHubTool({
          organizationId,
          toolName: "get_recent_commits", // Must match the capability exposed by the actual MCP server
          args: {
            repository: input.repository,
            since: input.since,
          },
        });

        // Normalize evidence
        const evidence = normalizeGitHubEvidence(result, "commits");

        return JSON.stringify(evidence);
      } catch (err: any) {
        return JSON.stringify({
          error: `Failed to fetch GitHub commits: ${err?.message || err}`,
        });
      }
    },
    {
      name: "get_recent_github_commits",
      description: "Fetch recent commits from a specified GitHub repository to identify recent code changes that may have caused the incident.",
      schema: z.object({
        repository: z.string().describe("The repository identifier e.g. 'acme-corp/payment-service'"),
        since: z.string().optional().describe("ISO timestamp to fetch commits since"),
      }),
    }
  );
}

/**
 * Tool: Fetch recent pull requests for a given repository.
 */
export function createGetRecentPullRequestsTool(organizationId: string) {
  return tool(
    async (input) => {
      try {
        const result = await GithubMcpService.callGitHubTool({
          organizationId,
          toolName: "get_pull_requests", // Must match the capability exposed by the actual MCP server
          args: {
            repository: input.repository,
            state: input.state || "all",
          },
        });

        // Normalize evidence
        const evidence = normalizeGitHubEvidence(result, "pull_requests");

        return JSON.stringify(evidence);
      } catch (err: any) {
        return JSON.stringify({
          error: `Failed to fetch GitHub pull requests: ${err?.message || err}`,
        });
      }
    },
    {
      name: "get_recent_github_pull_requests",
      description: "Fetch recent pull requests from a specified GitHub repository to identify code changes.",
      schema: z.object({
        repository: z.string().describe("The repository identifier e.g. 'acme-corp/payment-service'"),
        state: z.enum(["open", "closed", "all"]).optional().describe("Filter by PR state"),
      }),
    }
  );
}
