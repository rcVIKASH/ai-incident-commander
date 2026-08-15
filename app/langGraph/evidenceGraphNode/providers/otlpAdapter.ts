// Translates OTLP/JSON-shaped telemetry (the format a real OpenTelemetry
// Collector or APM backend hands back) into this project's internal
// evidence types. Not a full OTLP client — covers resource attributes,
// logs, spans, and gauge/sum metric points, which is what
// OtlpTelemetryProvider needs to satisfy TelemetryProvider.
//
// Histogram/summary metric points aren't handled — add a branch in
// mapOtlpMetrics if a metric you need is exported as one of those.

import {
  LogRecord,
  MetricPoint,
  TraceRecord,
  SpanRecord,
  AttributeValue,
} from "../../../types/evidence.js";

// ---------------------------------------------------------------------------
// Minimal OTLP/JSON shapes this adapter accepts
// ---------------------------------------------------------------------------

type OtlpAnyValue =
  | { stringValue: string }
  | { boolValue: boolean }
  | { intValue: string | number }
  | { doubleValue: number };

type OtlpKeyValue = {
  key: string;
  value: OtlpAnyValue;
};

type OtlpResource = {
  attributes?: OtlpKeyValue[];
};

type OtlpLogRecord = {
  timeUnixNano: string;
  severityText?: string;
  body?: OtlpAnyValue;
  attributes?: OtlpKeyValue[];
  traceId?: string;
  spanId?: string;
};

export type OtlpResourceLogs = {
  resource?: OtlpResource;
  scopeLogs: { logRecords: OtlpLogRecord[] }[];
};

type OtlpSpan = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  status?: { code: 0 | 1 | 2 }; // 0=UNSET, 1=OK, 2=ERROR
  attributes?: OtlpKeyValue[];
};

export type OtlpResourceSpans = {
  resource?: OtlpResource;
  scopeSpans: { spans: OtlpSpan[] }[];
};

type OtlpNumberDataPoint = {
  timeUnixNano: string;
  asDouble?: number;
  asInt?: string | number;
};

type OtlpMetric = {
  name: string;
  gauge?: { dataPoints: OtlpNumberDataPoint[] };
  sum?: { dataPoints: OtlpNumberDataPoint[] };
};

export type OtlpResourceMetrics = {
  resource?: OtlpResource;
  scopeMetrics: { metrics: OtlpMetric[] }[];
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function nanoToIso(nanos: string): string {
  return new Date(Number(BigInt(nanos) / 1_000_000n)).toISOString();
}

function nanoToMs(nanos: string): number {
  return Number(BigInt(nanos) / 1_000_000n);
}

function nanoDiffMs(startNanos: string, endNanos: string): number {
  return Number((BigInt(endNanos) - BigInt(startNanos)) / 1_000_000n);
}

function otlpValueToAttribute(value: OtlpAnyValue): AttributeValue {
  if ("stringValue" in value) return value.stringValue;
  if ("boolValue" in value) return value.boolValue;
  if ("intValue" in value) return Number(value.intValue);
  if ("doubleValue" in value) return value.doubleValue;
  return "";
}

function mapAttributes(attrs?: OtlpKeyValue[]): LogRecord["attributes"] {
  if (!attrs || attrs.length === 0) return undefined;
  const out: Record<string, AttributeValue> = {};
  for (const { key, value } of attrs) {
    out[key] = otlpValueToAttribute(value);
  }
  return out;
}

function resourceServiceName(resource?: OtlpResource): string {
  const match = resource?.attributes?.find((a) => a.key === "service.name");
  return match ? String(otlpValueToAttribute(match.value)) : "unknown-service";
}

// Maps OTel status codes (0=UNSET, 1=OK, 2=ERROR) to project SpanStatus
const OTLP_STATUS_CODE: Record<number, SpanRecord["status"]> = {
  0: "UNSET",
  1: "OK",
  2: "ERROR",
};

// Maps OTel severity text prefixes to project Severity type
const SEVERITY_PREFIXES: [prefix: string, severity: LogRecord["severity"]][] = [
  ["FATAL", "FATAL"],
  ["ERROR", "ERROR"],
  ["WARN", "WARN"],
  ["INFO", "INFO"],
  ["DEBUG", "DEBUG"],
  ["TRACE", "DEBUG"],
];

function mapSeverity(severityText?: string): LogRecord["severity"] {
  if (!severityText) return "INFO";
  const upper = severityText.toUpperCase();
  const match = SEVERITY_PREFIXES.find(([prefix]) => upper.startsWith(prefix));
  return match ? match[1] : "INFO";
}

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

export function mapOtlpLogs(resourceLogs: OtlpResourceLogs[]): LogRecord[] {
  const out: LogRecord[] = [];

  for (const rl of resourceLogs) {
    const service = resourceServiceName(rl.resource);

    for (const scope of rl.scopeLogs) {
      for (const rec of scope.logRecords) {
        out.push({
          timestamp: nanoToIso(rec.timeUnixNano),
          service,
          severity: mapSeverity(rec.severityText),
          message: rec.body ? String(otlpValueToAttribute(rec.body)) : "",
          attributes: mapAttributes(rec.attributes),
          traceId: rec.traceId,
          spanId: rec.spanId,
        });
      }
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Traces — spans are grouped into TraceRecords by traceId
// ---------------------------------------------------------------------------

export function mapOtlpTraces(resourceSpans: OtlpResourceSpans[]): TraceRecord[] {
  const byTraceId = new Map<string, { service: string; spans: OtlpSpan[] }>();

  for (const rs of resourceSpans) {
    const service = resourceServiceName(rs.resource);

    for (const scope of rs.scopeSpans) {
      for (const span of scope.spans) {
        const entry = byTraceId.get(span.traceId);
        if (entry) {
          entry.spans.push(span);
        } else {
          byTraceId.set(span.traceId, { service, spans: [span] });
        }
      }
    }
  }

  const traces: TraceRecord[] = [];

  for (const [traceId, { service, spans }] of byTraceId) {
    const mappedSpans: SpanRecord[] = spans.map((s) => ({
      spanId: s.spanId,
      parentSpanId: s.parentSpanId,
      service,
      operation: s.name,
      durationMs: nanoDiffMs(s.startTimeUnixNano, s.endTimeUnixNano),
      status: OTLP_STATUS_CODE[s.status?.code ?? 0] ?? "OK",
      attributes: mapAttributes(s.attributes),
    }));

    // Root span = the one with no parent, or whose parent isn't in this trace.
    const spanIds = new Set(mappedSpans.map((s) => s.spanId));
    const root =
      mappedSpans.find((s) => !s.parentSpanId || !spanIds.has(s.parentSpanId)) ??
      mappedSpans[0];

    const starts = spans.map((s) => nanoToMs(s.startTimeUnixNano));
    const ends = spans.map((s) => nanoToMs(s.endTimeUnixNano));
    const earliestStart = Math.min(...starts);
    const latestEnd = Math.max(...ends);

    traces.push({
      traceId,
      timestamp: new Date(earliestStart).toISOString(),
      service: root?.service ?? service,
      durationMs: latestEnd - earliestStart,
      status: mappedSpans.some((s) => s.status === "ERROR") ? "ERROR" : root?.status ?? "OK",
      spans: mappedSpans,
    });
  }

  return traces;
}

// ---------------------------------------------------------------------------
// Metrics — gauge and sum data points only (see file header note)
// ---------------------------------------------------------------------------

export function mapOtlpMetrics(resourceMetrics: OtlpResourceMetrics[]): MetricPoint[] {
  const out: MetricPoint[] = [];

  for (const rm of resourceMetrics) {
    for (const scope of rm.scopeMetrics) {
      for (const metric of scope.metrics) {
        const dataPoints = metric.gauge?.dataPoints ?? metric.sum?.dataPoints ?? [];

        for (const dp of dataPoints) {
          const value = dp.asDouble ?? (dp.asInt !== undefined ? Number(dp.asInt) : 0);
          out.push({ timestamp: nanoToIso(dp.timeUnixNano), name: metric.name, value });
        }
      }
    }
  }

  return out;
}