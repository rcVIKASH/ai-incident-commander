export type TimeRange = {
  start: string;
  end: string;
};

export type LogQuery = {
  service: string;
  environment?: string;
  timeRange: TimeRange;
  severities?: ("ERROR" | "WARN" | "INFO")[];
  keyword?: string;
  limit?: number;
};

export type MetricQuery = {
  service: string;
  environment?: string;
  timeRange: TimeRange;
  metricNames: string[];
};

export type TraceQuery = {
  service: string;
  environment?: string;
  timeRange: TimeRange;
  status?: "ERROR" | "OK";
  limit?: number;
};

export type LogRecord = {
  timestamp: string;
  service: string;
  severity: "ERROR" | "WARN" | "INFO";
  message: string;
  attributes?: Record<string, string>;
  traceId?: string;
};

export type MetricPoint = {
  timestamp: string;
  name: string;
  value: number;
};

export type SpanRecord = {
  service: string;
  operation: string;
  durationMs: number;
  status: "ERROR" | "OK";
  attributes?: Record<string, string>;
};

export type TraceRecord = {
  traceId: string;
  timestamp: string;
  service: string;
  durationMs: number;
  status: "ERROR" | "OK";
  spans: SpanRecord[];
};

export type ServiceHealth = {
  service: string;
  status: "HEALTHY" | "DEGRADED" | "DOWN";
  activeAlertsCount: number;
  uptimePercent: number;
  lastDeploymentAt?: string;
};

export type DeploymentRecord = {
  deploymentId: string;
  service: string;
  version: string;
  timestamp: string;
  deployedBy: string;
  status: "SUCCESS" | "FAILED" | "IN_PROGRESS";
  commitHash?: string;
};

export type CommitRecord = {
  hash: string;
  author: string;
  timestamp: string;
  message: string;
  service: string;
};

export type EvidenceQuery = {
  service: string;
  environment?: string;
  timeRange: TimeRange;

  logs: LogQuery;
  metrics: MetricQuery;
  traces: TraceQuery;
};

export type RawEvidence = {
  logs: LogRecord[];
  metrics: MetricPoint[];
  traces: TraceRecord[];
  health?: ServiceHealth;
  deployments?: DeploymentRecord[];
  commits?: CommitRecord[];
};

export type ProcessedEvidence = {
  summaryText: string;
  logs: {
    totalErrors: number;
    totalWarnings: number;
    topErrors: {
      message: string;
      count: number;
    }[];
  };

  metrics: {
    name: string;
    baseline?: number;
    peak?: number;
    latest?: number;
    changePercent?: number;
    anomalyDetected: boolean;
  }[];

  traces: {
    total: number;
    failed: number;
    errorRatePercent: number;
    p95DurationMs: number;
    commonFailurePaths: string[][];
  };

  health?: ServiceHealth;
  deployments?: {
    latestVersion?: string;
    recentCount: number;
    lastDeployedAt?: string;
  };
  commits?: {
    recentCount: number;
    topMessages: string[];
  };
};