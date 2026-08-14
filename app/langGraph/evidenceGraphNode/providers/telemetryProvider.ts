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

export interface TelemetryProvider {
  getLogs(query: LogQuery): Promise<LogRecord[]>;
  getMetrics(query: MetricQuery): Promise<MetricPoint[]>;
  getTraces(query: TraceQuery): Promise<TraceRecord[]>;
  getServiceHealth?(service: string): Promise<ServiceHealth>;
  getDeployments?(service: string, limit?: number): Promise<DeploymentRecord[]>;
  getRecentCommits?(service: string, limit?: number): Promise<CommitRecord[]>;
}