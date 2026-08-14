import { TelemetryProvider } from "./telemetryProvider.js";
import {
  LogQuery,
  MetricQuery,
  TraceQuery,
  LogRecord,
  MetricPoint,
  TraceRecord,
  ServiceHealth,
  DeploymentRecord,
  CommitRecord,
} from "../../../types/evidence.js";

/**
 * Mock OpenTelemetry provider for testing & development.
 * Simulates OpenTelemetry collector query responses (Loki/Elastic logs, Prometheus metrics, Jaeger/Tempo traces, K8s deployments, Git commits).
 */
export class MockTelemetryProvider implements TelemetryProvider {
  async getLogs(query: LogQuery): Promise<LogRecord[]> {
    const service = query.service;
    const now = new Date(query.timeRange?.start ? new Date(query.timeRange.start) : Date.now());

    const allLogs: LogRecord[] = [
      {
        timestamp: new Date(now.getTime() - 200000).toISOString(),
        service,
        severity: "ERROR",
        message: `HTTP 504 Gateway Timeout while calling upstream dependency /v1/${service}/checkout`,
        attributes: {
          "http.status_code": "504",
          "error.type": "GatewayTimeout",
          "net.peer.name": "db-connection-pool",
        },
        traceId: "trace-991204-a8f",
      },
      {
        timestamp: new Date(now.getTime() - 150000).toISOString(),
        service,
        severity: "ERROR",
        message: `HTTP 504 Gateway Timeout while calling upstream dependency /v1/${service}/checkout`,
        attributes: {
          "http.status_code": "504",
          "error.type": "GatewayTimeout",
        },
        traceId: "trace-991204-b9c",
      },
      {
        timestamp: new Date(now.getTime() - 100000).toISOString(),
        service,
        severity: "ERROR",
        message: `Connection pool exhausted: active connections 50/50, queue size limit exceeded`,
        attributes: {
          "db.system": "postgresql",
          "db.name": "payment_db",
          "error.type": "PoolExhausted",
        },
        traceId: "trace-991205-c1d",
      },
      {
        timestamp: new Date(now.getTime() - 80000).toISOString(),
        service,
        severity: "WARN",
        message: `High memory pressure detected: GC pause duration exceeds 450ms`,
        attributes: {
          "system.memory.utilization": "0.92",
        },
      },
      {
        timestamp: new Date(now.getTime() - 40000).toISOString(),
        service,
        severity: "ERROR",
        message: `HTTP 504 Gateway Timeout while calling upstream dependency /v1/${service}/checkout`,
        attributes: {
          "http.status_code": "504",
          "error.type": "GatewayTimeout",
        },
        traceId: "trace-991206-d2e",
      },
      {
        timestamp: new Date(now.getTime() - 10000).toISOString(),
        service,
        severity: "INFO",
        message: `Health check probe succeeded`,
        attributes: {
          "http.status_code": "200",
        },
      },
    ];

    let result = allLogs;

    // Filter by severities if specified (e.g. ERROR, WARN)
    if (query.severities && query.severities.length > 0) {
      result = result.filter((log) => query.severities!.includes(log.severity));
    }

    // Filter by keyword query if specified
    if (query.keyword) {
      const kw = query.keyword.toLowerCase();
      result = result.filter(
        (log) =>
          log.message.toLowerCase().includes(kw) ||
          JSON.stringify(log.attributes || {}).toLowerCase().includes(kw)
      );
    }

    // Apply cap limit
    if (query.limit && query.limit > 0) {
      result = result.slice(0, query.limit);
    }

    return result;
  }

  async getMetrics(query: MetricQuery): Promise<MetricPoint[]> {
    const startTime = query.timeRange?.start ? new Date(query.timeRange.start).getTime() : Date.now() - 15 * 60 * 1000;
    const points: MetricPoint[] = [];

    // Produce baseline vs peak data points for requested metrics
    const metricsToGenerate =
      query.metricNames && query.metricNames.length > 0
        ? query.metricNames
        : [
            "http.server.duration",
            "http.server.error_rate",
            "system.cpu.utilization",
            "db.client.connections.usage",
          ];

    for (const name of metricsToGenerate) {
      for (let i = 0; i < 5; i++) {
        const pointTime = new Date(startTime + i * 180000).toISOString();
        let val = 10;

        if (name.includes("duration") || name.includes("latency")) {
          val = i < 2 ? 150 : 2450; // latency spike from 150ms -> 2450ms
        } else if (name.includes("error_rate")) {
          val = i < 2 ? 0.01 : 0.28; // error rate spike from 1% -> 28%
        } else if (name.includes("cpu")) {
          val = i < 2 ? 0.35 : 0.88; // CPU spike from 35% -> 88%
        } else if (name.includes("connections")) {
          val = i < 2 ? 15 : 50; // DB pool connections from 15 -> 50
        }

        points.push({
          timestamp: pointTime,
          name,
          value: val,
        });
      }
    }

    return points;
  }

  async getTraces(query: TraceQuery): Promise<TraceRecord[]> {
    const service = query.service;
    const allTraces: TraceRecord[] = [
      {
        traceId: "trace-991204-a8f",
        timestamp: new Date().toISOString(),
        service,
        durationMs: 2450,
        status: "ERROR",
        spans: [
          {
            service: "api-gateway",
            operation: "POST /v1/payments",
            durationMs: 2450,
            status: "ERROR",
          },
          {
            service,
            operation: "processPayment",
            durationMs: 2400,
            status: "ERROR",
          },
          {
            service: "payment-db",
            operation: "SELECT FOR UPDATE accounts",
            durationMs: 2000,
            status: "ERROR",
            attributes: { "error.message": "Connection timeout after 2000ms" },
          },
        ],
      },
      {
        traceId: "trace-991205-c1d",
        timestamp: new Date().toISOString(),
        service,
        durationMs: 2100,
        status: "ERROR",
        spans: [
          {
            service: "api-gateway",
            operation: "POST /v1/payments",
            durationMs: 2100,
            status: "ERROR",
          },
          {
            service,
            operation: "processPayment",
            durationMs: 2080,
            status: "ERROR",
          },
          {
            service: "payment-db",
            operation: "SELECT FOR UPDATE accounts",
            durationMs: 2000,
            status: "ERROR",
            attributes: { "error.message": "PoolExhausted" },
          },
        ],
      },
      {
        traceId: "trace-991206-ok1",
        timestamp: new Date().toISOString(),
        service,
        durationMs: 140,
        status: "OK",
        spans: [
          {
            service: "api-gateway",
            operation: "GET /health",
            durationMs: 140,
            status: "OK",
          },
          {
            service,
            operation: "healthCheck",
            durationMs: 120,
            status: "OK",
          },
        ],
      },
    ];

    let result = allTraces;
    if (query.status) {
      result = result.filter((t) => t.status === query.status);
    }
    if (query.limit && query.limit > 0) {
      result = result.slice(0, query.limit);
    }
    return result;
  }

  async getServiceHealth(service: string): Promise<ServiceHealth> {
    return {
      service,
      status: "DEGRADED",
      activeAlertsCount: 2,
      uptimePercent: 98.4,
      lastDeploymentAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    };
  }

  async getDeployments(service: string, limit: number = 5): Promise<DeploymentRecord[]> {
    const deployments: DeploymentRecord[] = [
      {
        deploymentId: "dep-8812",
        service,
        version: "v2.14.0",
        timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
        deployedBy: "ci-cd-bot",
        status: "SUCCESS",
        commitHash: "a7d9f12",
      },
      {
        deploymentId: "dep-8811",
        service,
        version: "v2.13.9",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        deployedBy: "devops-lead",
        status: "SUCCESS",
        commitHash: "b8e102c",
      },
    ];
    return deployments.slice(0, limit);
  }

  async getRecentCommits(service: string, limit: number = 5): Promise<CommitRecord[]> {
    return [
      {
        hash: "a7d9f12",
        author: "alex.dev@saas.com",
        timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        message: "fix(db): increase DB connection pool timeout and retry logic",
        service,
      },
      {
        hash: "b8e102c",
        author: "sarah.eng@saas.com",
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        message: "feat(payments): add retry middleware for failed payment intents",
        service,
      },
    ].slice(0, limit);
  }
}
