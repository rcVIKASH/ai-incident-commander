
// Internal domain model for evidence collected by investigation tools.
// This is deliberately NOT shaped like OTLP wire format — see otel-adapter.ts
// for the translation layer that maps real OTel-shaped payloads into these types.

export type TimeRange = {
  start: string; // ISO 8601
  end: string; // ISO 8601
};

export type Severity = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

export type SpanStatus = "OK" | "ERROR" | "UNSET";

// Aligned to OTel's attribute value union (string/number/boolean).
// Anything richer (arrays, nested maps) gets flattened/stringified at the
// adapter boundary rather than passed through raw.
export type AttributeValue = string | number | boolean;
export type Attributes = Record<string, AttributeValue>;

// ---------------------------------------------------------------------------
// Queries — what an investigation tool call asks a monitoring backend for
// ---------------------------------------------------------------------------

export type LogQuery = {
  service: string;
  environment?: string;
  timeRange: TimeRange;
  severities?: Severity[];
  keyword?: string;
  /** Correlate to a specific trace/span once one has been identified as failing. */
  traceId?: string;
  spanId?: string;
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
  status?: SpanStatus;
  traceId?: string;
  limit?: number;
};

// service/environment/timeRange live once at the top level; each sub-query
// only carries its signal-specific fields to avoid asking three times.
export type EvidenceQuery = {
  service: string;
  environment?: string;
  timeRange: TimeRange;

  logs?: Omit<LogQuery, "service" | "environment" | "timeRange">;
  metrics?: Omit<MetricQuery, "service" | "environment" | "timeRange">;
  traces?: Omit<TraceQuery, "service" | "environment" | "timeRange">;
};

// ---------------------------------------------------------------------------
// Raw records — what a tool call returns, full fidelity
// ---------------------------------------------------------------------------

export type LogRecord = {
  timestamp: string;
  service: string;
  severity: Severity;
  message: string;
  attributes?: Attributes;
  traceId?: string;
  spanId?: string;
};

export type MetricPoint = {
  timestamp: string;
  name: string;
  value: number;
};

export type SpanRecord = {
  spanId: string;
  /** Absent (or not found among sibling spans) marks this as the trace's root span. */
  parentSpanId?: string;
  service: string;
  operation: string;
  durationMs: number;
  status: SpanStatus;
  attributes?: Attributes;
};

export type TraceRecord = {
  traceId: string;
  timestamp: string;
  /** Root/entry service for this trace — a trace can span multiple services. */
  service: string;
  durationMs: number;
  status: SpanStatus;
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

export type RawEvidence = {
  logs: LogRecord[];
  metrics: MetricPoint[];
  traces: TraceRecord[];
  health?: ServiceHealth;
  deployments?: DeploymentRecord[];
  commits?: CommitRecord[];
};

// ---------------------------------------------------------------------------
// Processed evidence — compact, LLM-facing summary derived from RawEvidence
// ---------------------------------------------------------------------------

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
    /** Service call chains, derived by walking parentSpanId links in failed traces. */
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