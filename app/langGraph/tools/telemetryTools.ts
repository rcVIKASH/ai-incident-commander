import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { TelemetryProvider } from "../evidenceGraphNode/providers/telemetryProvider.js";
import { MockTelemetryProvider } from "../evidenceGraphNode/providers/mockTelemetryProvider.js";

const defaultProvider: TelemetryProvider = new MockTelemetryProvider();

/**
 * Tool: Fetch targeted application and telemetry logs
 */
export function createGetLogsTool(provider: TelemetryProvider = defaultProvider) {
  return tool(
    async (input) => {
      try {
        const logs = await provider.getLogs({
          service: input.service,
          environment: input.environment,
          timeRange: {
            start: input.startTime || new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            end: input.endTime || new Date().toISOString(),
          },
          severities: input.severities,
          keyword: input.keyword,
          limit: input.limit ?? 50,
        });

        return JSON.stringify({
          service: input.service,
          count: logs.length,
          logs,
        });
      } catch (err: any) {
        return JSON.stringify({
          error: `Failed to fetch logs: ${err?.message || err}`,
        });
      }
    },
    {
      name: "get_logs",
      description:
        "Fetch targeted error and warning logs for a specific service and time window from telemetry logs store. Filters out irrelevant logs.",
      schema: z.object({
        service: z.string().describe("Target service name"),
        startTime: z.string().optional().describe("ISO start timestamp"),
        endTime: z.string().optional().describe("ISO end timestamp"),
        severities: z
          .array(z.enum(["ERROR", "WARN", "INFO"]))
          .optional()
          .describe("Filter severities e.g. ['ERROR', 'WARN']"),
        keyword: z.string().optional().describe("Optional log message or attribute keyword filter"),
        limit: z.number().optional().describe("Max number of log records (default 50)"),
        environment: z.string().optional().describe("Environment e.g. production, staging"),
      }),
    }
  );
}

/**
 * Tool: Fetch performance telemetry metrics (duration, error rate, CPU, DB connections)
 */
export function createGetMetricsTool(provider: TelemetryProvider = defaultProvider) {
  return tool(
    async (input) => {
      try {
        const metrics = await provider.getMetrics({
          service: input.service,
          environment: input.environment,
          timeRange: {
            start: input.startTime || new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            end: input.endTime || new Date().toISOString(),
          },
          metricNames: input.metricNames || [],
        });

        return JSON.stringify({
          service: input.service,
          count: metrics.length,
          metrics,
        });
      } catch (err: any) {
        return JSON.stringify({
          error: `Failed to fetch metrics: ${err?.message || err}`,
        });
      }
    },
    {
      name: "get_metrics",
      description:
        "Fetch metrics time-series (latency, error rate, CPU usage, DB connection pool) for a service.",
      schema: z.object({
        service: z.string().describe("Target service name"),
        metricNames: z
          .array(z.string())
          .optional()
          .describe("Metric names e.g. ['http.server.duration', 'system.cpu.utilization']"),
        startTime: z.string().optional().describe("ISO start timestamp"),
        endTime: z.string().optional().describe("ISO end timestamp"),
        environment: z.string().optional().describe("Environment e.g. production, staging"),
      }),
    }
  );
}

/**
 * Tool: Fetch distributed trace spans for error investigation
 */
export function createGetTracesTool(provider: TelemetryProvider = defaultProvider) {
  return tool(
    async (input) => {
      try {
        const traces = await provider.getTraces({
          service: input.service,
          environment: input.environment,
          timeRange: {
            start: input.startTime || new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            end: input.endTime || new Date().toISOString(),
          },
          status: input.status,
          limit: input.limit ?? 20,
        });

        return JSON.stringify({
          service: input.service,
          count: traces.length,
          traces,
        });
      } catch (err: any) {
        return JSON.stringify({
          error: `Failed to fetch traces: ${err?.message || err}`,
        });
      }
    },
    {
      name: "get_traces",
      description:
        "Fetch distributed telemetry trace records and child span error paths for root cause analysis.",
      schema: z.object({
        service: z.string().describe("Target service name"),
        status: z.enum(["ERROR", "OK"]).optional().describe("Filter trace status"),
        startTime: z.string().optional().describe("ISO start timestamp"),
        endTime: z.string().optional().describe("ISO end timestamp"),
        limit: z.number().optional().describe("Max traces to return (default 20)"),
        environment: z.string().optional().describe("Environment e.g. production, staging"),
      }),
    }
  );
}

/**
 * Tool: Fetch service health and active alerts
 */
export function createGetServiceHealthTool(provider: TelemetryProvider = defaultProvider) {
  return tool(
    async (input) => {
      try {
        if (!provider.getServiceHealth) {
          return JSON.stringify({ status: "UNKNOWN", service: input.service });
        }
        const health = await provider.getServiceHealth(input.service);
        return JSON.stringify(health);
      } catch (err: any) {
        return JSON.stringify({ error: `Failed to fetch service health: ${err?.message || err}` });
      }
    },
    {
      name: "get_service_health",
      description: "Fetch real-time operational health status, active alerts count, and uptime for a service.",
      schema: z.object({
        service: z.string().describe("Target service name"),
      }),
    }
  );
}

/**
 * Tool: Fetch recent deployments for a service
 */
export function createGetDeploymentsTool(provider: TelemetryProvider = defaultProvider) {
  return tool(
    async (input) => {
      try {
        if (!provider.getDeployments) {
          return JSON.stringify({ deployments: [] });
        }
        const deployments = await provider.getDeployments(input.service, input.limit ?? 5);
        return JSON.stringify({ service: input.service, deployments });
      } catch (err: any) {
        return JSON.stringify({ error: `Failed to fetch deployments: ${err?.message || err}` });
      }
    },
    {
      name: "get_deployments",
      description: "Fetch recent deployments and code releases for a service to detect deployment regressions.",
      schema: z.object({
        service: z.string().describe("Target service name"),
        limit: z.number().optional().describe("Max deployment records to return (default 5)"),
      }),
    }
  );
}

/**
 * Tool: Fetch recent git commits for a service
 */
export function createGetRecentCommitsTool(provider: TelemetryProvider = defaultProvider) {
  return tool(
    async (input) => {
      try {
        if (!provider.getRecentCommits) {
          return JSON.stringify({ commits: [] });
        }
        const commits = await provider.getRecentCommits(input.service, input.limit ?? 5);
        return JSON.stringify({ service: input.service, commits });
      } catch (err: any) {
        return JSON.stringify({ error: `Failed to fetch recent commits: ${err?.message || err}` });
      }
    },
    {
      name: "get_recent_commits",
      description: "Fetch recent git commit history for a service to correlate code changes with alerts.",
      schema: z.object({
        service: z.string().describe("Target service name"),
        limit: z.number().optional().describe("Max commit records to return (default 5)"),
      }),
    }
  );
}

/**
 * Helper to construct all telemetry tools for an optional provider
 */
export function getTelemetryTools(provider: TelemetryProvider = defaultProvider) {
  return [
    createGetLogsTool(provider),
    createGetMetricsTool(provider),
    createGetTracesTool(provider),
    createGetServiceHealthTool(provider),
    createGetDeploymentsTool(provider),
    createGetRecentCommitsTool(provider),
  ];
}
